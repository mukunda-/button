<?php

require_once "sql.php";

$apath = rtrim(dirname($_SERVER['PHP_SELF']), '/\\').'/'; 

$SLOTS = 1; // number of discussions that can be performed
            // concurrently.

$COMPOSE_TIMEOUT = 60*5; // number of seconds a composition
                         // has to be submitted before it is
						 // deleted
 
//-----------------------------------------------------------------------------
abstract class TopicStates {
    const Deleted	= 0;
    const Old		= 1;
    const Composing	= 2;
    const Live		= 3;
}

//-----------------------------------------------------------------------------
class Comment {
	public $text;
	public $goods;
	public $bads;
	public $vote; // true, false, or NULL
	public $time;
	
	public function __construct( $row ) {
		// create from SQL row
		
		$this->text = $row['content'];
		$this->goods = $row['goods'];
		$this->bads = $row['bads'];
		$this->time = $row['time'];
		$this->vote = $row['vote'];
	}
}

//-----------------------------------------------------------------------------
class Topic {
	public $id;
	public $ip;
	public $text = "";
	public $state;
	public $comments = array();
	public $goods;
	public $bads;
	public $vote; // the vote for this ip, TRUE, FALSE, or NULL
	public $time;
	public $valid;
	
	private function ScoreCmp( $a, $b ) {
		$c = $a->goods - $a->bads;
		$d = $b->goods - $b->bads;
		if( $c == $d ) return 0;
		return ($c>$d) ? -1 : 1;
	}
	
	public function __construct( $id, $xip, $challenge ) {
		$this->id = $id;
		$this->ip = $xip;
		
		$this->valid = false;
		
		$sql = GetSQL();
		$result = $sql->safequery( 
			"SELECT state, challenge, goods, bads, time, content, vote FROM Topics ".
			" LEFT JOIN TopicVotes ON (topicid=id AND TopicVotes.ip=x'$xip') ".
			" WHERE id=$id" );
		
		$row = $result->fetch_assoc();
		if( $row === FALSE ) return;
		if( $challenge != $row['challenge'] ) return;
		$state = $row['state'];
		$this->state = $state;
		
		$this->text = $row['content'];
		$this->goods = $row['goods'];
		$this->bads = $row['bads'];
		$this->vote = $row['vote'];
		$this->time = $row['time'];
		$this->valid = true;
		
		if( $state == TopicStates::Deleted   || 
			$state == TopicStates::Composing ) {
			
			return;
		}
		
		// get comments
		
		$result = $sql->safequery( 
			"SELECT goods, bads, time, content, vote FROM Comments ".
			" LEFT JOIN CommentVotes ON (commentid=id AND CommentVotes.ip=x'$xip') ".
			" WHERE topic=$id" );
			
		while( $row = $result->fetch_assoc() ) {
			$comments[] = new Comment( $row );
		}
		
		if( $state == TopicStates::Old ) {
			// sort comments by score
			usort( $comments, ScoreCmp );
		} else if( $state == TopicState::Live ) {
			// sort comments randomly
			shuffle( $comments );
		}
	}
}

//-----------------------------------------------------------------------------
function GetIPHex() {
	return bin2hex(inet_pton( $_SERVER['REMOTE_ADDR'] ));
}
 
//-----------------------------------------------------------------------------
function ReadCookieInt( $key ) {
	if( !isset($_COOKIE[$key]) ) return 0;
	return is_numeric($_COOKIE[$key]) ? (int)$_COOKIE[$key] : 0;
}

// page is the topic they are on
$g_page = ReadCookieInt('page');
// challenge is used to verify authority to view a topic
$g_challenge = ReadCookieInt('challenge');
echo "challenge=$g_challenge<br>";

//-----------------------------------------------------------------------------
function IsPageValid( $page, $challenge ) {
	if( $page == 0 ) return false;
	
	$sql = GetSQL();
	$result =$sql->safequery( 
		"SELECT state,time FROM Topics WHERE id=$page AND challenge=$challenge");
	
	$row = $result->fetch_assoc();
	if( $row === FALSE ) return false;
	// TODO make sure they get a new topic on the next refresh.
	if( $row['state'] == TopicStates::Deleted ) {
		setcookie( "page", 0, 0, $apath );
		return true;
	}
	if( $row['state'] == TopicStates::Composing && time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT'] ) ) {
		// delete composition, they took too long.
		$sql->safequery( "DELETE FROM Topics WHERE id=$page" );
		return false;
	}
	return true;
}

if( !IsPageValid( $g_page, $g_challenge ) ) {
	$g_page = 0;
}

//-----------------------------------------------------------------------------
function GetNewPage() {
	global $SLOTS, $g_page, $g_challenge, $apath;
	
	$sql = GetSQL();
	$s_live = TopicStates::Live;
	$s_comp = TopicStates::Composing;
	$result = $sql->safequery( "LOCK TABLES Topics WRITE,  TopicVotes READ" );
	
	$xip = GetIPHex();
	
	$result = $sql->safequery( 
		"SELECT id,state,time,vote,goods,bads FROM Topics LEFT JOIN TopicVotes ON (topicid=id AND TopicVotes.ip=x'$xip')".
		" WHERE (state=$s_live OR state=$s_comp) LIMIT $SLOTS");
	
	if( $result->num_rows < $SLOTS ) {
		// chance to make a new 
		if( mt_rand( 0, $SLOTS-1 ) >= $result->num_rows ) {
			// start new composition
			echo 'new composition<br>';
			$g_challenge = (int)mt_rand();
			$sql->safequery( 
				"INSERT INTO Topics ( ip,state,challenge,goods,bads,time ) VALUES 
				( x'$xip', $s_comp, $g_challenge, 0, 0, ".time().")" );
	
			$sql->safequery( "UNLOCK TABLES" );
			$result = $sql->safequery( "SELECT LAST_INSERT_ID()" );
			$row = $result->fetch_row();
			$g_page = $row[0];
			setcookie( "page", $g_page, time() + 60*60*30, $apath );
			setcookie( "challenge", $g_challenge, time() + 60*60*30, $apath );
			return;
		}
	}
	$sql->safequery( "UNLOCK TABLES" );
	
	$choices = array();
	
	while( $row = $result->fetch_assoc() ) {
		if( $row['state'] == $s_comp ) {
			if( time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT']) ) {
				// delete timed-out composition.
				// we double-check that it is still in composition mode.
				$sql->safequery( "DELETE FROM Topics WHERE id=".$row['id']." AND state=$s_comp" );
				continue;
			}
		} else if( $row['state'] == $s_live ) {
		
			$totalvotes = ($row['goods']+$row['bads']);
			if( $totalvotes == 0 )$totalvotes=1;
			$score = (float)$row['goods'] / ((float)$totalvotes);
			$removetime = 60*5;
			$delete = false;
			if( $score < 0.6 ) {
				// remove after 5 minutes
				$removetime = 60*5;
				$delete = true;
			} else {
				// remove after 30 minutes
				$removetime = 60*30;
			}
			
			if( time() >= ($row['time'] + $removetime) ) {
				// topic expired.
				if( $delete ) {
					$sql->safequery( 
					"UPDATE Topics SET state=".TopicStates::Deleted.
					" WHERE state=".$s_live." AND id=".$row['id'] );
				} else {
					$sql->safequery( 
					"UPDATE Topics SET state=".TopicStates::Old.
					" WHERE state=".$s_live." AND id=".$row['id'] );
				}
				continue;
			}
			
			if( $row['vote'] !== FALSE ) {
				$choices[] = $row['id'];
			}
		}
	}
	
	if( empty( $choices ) ) {
		$g_page = 0;
		setcookie( "page", 0, 0, $GLOBALS['apath'] );
		return;
	}
	
	$g_page = mt_rand( 0, count($choices)-1 );
	setcookie( "page", $g_page, time() + 60*60*30, $apath );
	setcookie( "challenge", $g_challenge, time() + 60*60*30, $apath );
}

//$g_page=0; // DEVBUG

if( $g_page == 0 ) {
	// try to find a new page
	
	GetNewPage();
	// at this point mypage is valid
	// and 0 is valid which means "no page available."
}


//-----------------------------------------------------------------------------
function StartTopic( $content ) {
	// content must be under 200 characters.
	$content = substr( $content, 0, 200 );
	$sql = GetSQL();
	$content = $sql->real_escape_string( $content );
	$time = time();
	
	$sql->safequery( "
		INSERT INTO Topics (score,time,content) VALUES
		(0, $time, '$content')" );
	
	$result = $sql->safequery( "SELECT LAST_INSERT_ID()" );
	$row = $result->fetch_row();
	return $row[0];
}

//-----------------------------------------------------------------------------------
///////////////////////////// BEGIN DOCUMENT HEADER /////////////////////////////////
?> 
<!DOCTYPE html>
<html>
<head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta charset="UTF-8">
	
	<link href='http://fonts.googleapis.com/css?family=Noto+Sans:400,700' rel='stylesheet' type='text/css'>
	
	<link rel="stylesheet" href="button.css" type="text/css">
	<script src="jquery-1.11.0.min.js"></script>
	<script src="jquery.mousewheel.min.js"></script>
	<title>hot topic</title>
	
	<style>
	
	.replies .reply .replyinput {
		color: red;
	}
	
	</style>
</head>
<body>
	
	
	<?php
	/////////////////////// BEGIN CONTENT /////////////////////////////////
	
	function ShowTopic() {
		global $g_page, $g_challenge;
		if( $g_page == 0 ) {
			echo '
				<div class="topic nothing" id="topic">
					nothing to discuss. try again later.
				</div>';
			return false;
		}
		$topic = new Topic( $g_page, GetIPHex(), $g_challenge );
		
		if( !$topic->valid ) {
			echo '
				<div class="topic nothing" id="topic">
					nothing to discuss. try again later.
				</div>';
			return false;
		}
		
		if( $topic->state == TopicStates::Deleted ) {
			echo '
				<div class="topic nothing" id="topic">
					this topic was buried.
				</div>';
			return false;
		}
		
		if( $topic->state == TopicStates::Composing ) {
			echo '<div class="topic composing" id="topic">
			        (composition)
				  </div>';
			return true;
		}
		
		echo '<div class="topic" id="topic">';
		echo $topic->content;
		if( $topic->state == TopicStates::Live ) {
			if( $topic->vote === true ) {
				echo '<div class="good" id="goodbutton"><img src="star.png" alt="good"></div>';
			} else {
				echo '<div class="good" id="goodbutton"><img src="unstar.png" alt="good"></div>';
			}
			if( $topic->vote === false ) {
				echo '<div class="bad" id="badbutton"><img src="notbad.png" alt="bad"></div>';
			} else {
				echo '<div class="bad" id="badbutton"><img src="bad.png" alt="bad"></div>';
			}
				
		} else if( $topic->state == TopicStates::Old ) {
			// todo print good/bad stats
		}
		echo '</div>';
		
		echo '<div class="replies" id="replies">';
		
		foreach( $topic->comments as $comment ) {
			echo '<div class="reply">';
			echo    $comment->text;
			if( $topic->state == TopicStates::Live ) {
				if( $comment->vote === true ) {
					echo '<div class="rvote rgood" ><img src="star.png" alt="good"></div>';
				} else {
					echo '<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>';
				}
				if( $comment->vote === false ) {
					echo '<div class="rvote rbad" ><img src="bad.png" alt="bad"></div>';
				} else {
					echo '<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>';
				}
			}
			echo '</div>';
		}
		
		if( $topic->state == TopicStates::Live ) {
			echo '<div class="reply">
				     <div class="replyinput init" id="replyinput" contenteditable="true">discuss...</div>
				  </div>';
		}
		
		echo '</div>';
		echo '<div class="padding" id="padding"></div>';
		
		return true;
	}
	
	$st = ShowTopic();
	
		//	<div class="good" id="goodbutton"><img src="unstar.png" alt="good"></div>
		//<div class="bad" id="badbutton"><img src="notbad.png" alt="bad"></div>
		//corn? corn? corn? corn? corn?
		
	?>
	
	<script>
	
	
		
		function adjustTop() {
			var poop = $('#topic');
			var height = poop.height() 
				+ parseInt(poop.css('padding-top'))
				+ parseInt(poop.css('padding-bottom'))
				;
			var sh = $( window ).height();
			
			$("#goodbutton").css( "top", (height / 2 - 16) + "px" );
			$("#badbutton").css( "top", (height / 2 - 16) + "px" );
			height += 16; // body margin
			poop.css( 'margin-top', ((sh/2)-(height/2)) + "px" );
		}
		
	</script>
	<!--
	<div class="options">
		<div class="good">
			good
		</div>
		<div class="bad">
			bad
		</div>
		
		<div class="change">
			change
		</div>
	</div>-->
	
	
	<script type="text/javascript">

	/*
		function GrowText(textField)
		{
		  if( parseInt(textField.style.height) > textField.scrollHeight ) {
		 
		  } 
		  console.log(textField.scrollHeight);
          textField.style.height = textField.scrollHeight+'px';
		   
		}
		
		function GrowTextD( textField ) {
			setTimeout( function() { GrowText(textField) }, 0 );
		}*/
	</script>
<!--
	<div class="replies" id="replies">
		<div class="reply">
		
			<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>
			<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>
		
		100,000 testes  testes  testes  testes  testes  testes  testes  testes  testes  testes  testes  testes  testes 
		</div>
		<div class="reply">
		
			<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>
			<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>
		
		10<br><br>hi<br>hi
		</div>
		<div class="reply">
		
			<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>
			<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>
		
		100<br><br>fawe
		</div>
		<div class="reply">
		
			<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>
			<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>
		
		100,000 metersjjj00 metersjjj00 metersjjj<br><br>fawe
		</div>
		<div class="reply">
		
			<div class="rvote rgood" ><img src="unstar.png" alt="good"></div>
			<div class="rvote rbad" ><img src="notbad.png" alt="bad"></div>
		
		100,000 metersjjj00 metersjjj00 metersjjj<br><br>fawe
		</div>
		
		<div class="reply">
			<div class="replyinput init" id="replyinput" contenteditable="true">discuss...</div>
		</div>
	</div>
	-->
	
	<script>
			//<textarea onkeydown="GrowTextD(this)" type="text" rows="1" placeholder="discuss..."></textarea>
			
		$('#replyinput').focus( function() {
			if( $(this).hasClass( 'init' ) ) {
				$(this).removeClass( 'init' );
				$(this).html("");
			}
		});
		function adjustBottom() {
			if( $('#replies').length != 0 ) {
				
			//	console.log( "gu" );
			//	var poop = $('#replies div:last-child');
			//	console.log( poop );
			//	var height = poop.height() 
				// 
			//		+ (parseInt(poop.css('padding-top'))||0)
			//		+ (parseInt(poop.css('padding-bottom'))||0)
			//		+ 8; // body margin
					
			//	console.log( (sh/2)-(height/2) );
				var sh = $( window ).height();
				 
				//$('#padding').css( 'height', ((sh/2)-(height/2)) + "px" );
				$('#padding').css( 'height', ((sh/2)) + "px" );
			}
		}
		
		$(window).bind("mousewheel",function(ev, delta) {
			var scrollTop = $(window).scrollTop()-Math.round(delta)*51;
			$(window).scrollTop(scrollTop-Math.round(delta)*51);
			/*$('html, body').animate( 
				{scrollTop: scrollTop}, //'slow' );
				{ duration: 'fast',
					queue: false } ); failure*/
		}); 
		
		function adjustSize() {
			adjustTop();
			adjustBottom();
			
			contentwidth = $(window).width() - 72 - 16; // - padding - body width
			
			if( contentwidth > 574 ) contentwidth = 574;
			if( contentwidth < 32 ) contentwidth = 32;
			
			$( '.replies .reply' ).css( 'max-width', contentwidth + 'px' );
		}
		
		adjustSize();
		
		$(window).resize( function () { 
			adjustSize();
		});
		
		$(window).load( function() {
			adjustSize();
			 
			//setTimeout( function() {adjustSize()}, 55 );
		});
		
	</script>
	<?php
	//echo StartTopic( "my peepee." ) . ' topics discussed.';
	?>
</body>
</html>
