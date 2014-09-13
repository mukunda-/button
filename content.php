<?php

require_once "sql.php";
require_once "topic_states.php";
require_once "config.php";
 
//-----------------------------------------------------------------------------
class Comment {
	public $content;
	public $goods;
	public $bads;
	public $vote; // true, false, or NULL
	public $time;
	
	public function __construct( $row ) {
		// create from SQL row
		
		$this->content = $row['content'];
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
	public $content = "";
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
		
		$this->content = $row['content'];
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
			
		$this->comments = array();
			
		while( $row = $result->fetch_assoc() ) {
			$this->comments[] = new Comment( $row );
		}
		
		if( $state == TopicStates::Old ) {
			// sort comments by score
			usort( $this->comments, ScoreCmp );
		} else if( $state == TopicStates::Live ) {
			// sort comments randomly
			shuffle( $this->comments );
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
//echo "challenge=$g_challenge<br>";

//-----------------------------------------------------------------------------
function IsPageValid( $page, $challenge ) {
	if( $page == 0 ) return false;
	
	global $apath;
	
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
			//echo 'new composition<br>';
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

function ShowTopic() {
	global $g_page, $g_challenge;
	if( $g_page == 0 ) {
		echo '
			<div class="topic nothing" id="topic">
				nothing to discuss. check again later.
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
				<div class="compose" contenteditable="true" id="composition"></div>
			  </div>';
			  
		echo '<div class="submit" onclick="submitComposition()" id="submit">discuss</div>';
		
		?>
		
		<script>
			$("#composition").keydown( function() {
				if( loading ) return false;
				setTimeout( compositionKeyPressed, 0 );
			});
			compose_sending = false;
		</script>
		
		<?php
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
			echo '<div class="bad" id="badbutton"><img src="bad.png" alt="bad"></div>';
		} else {
			echo '<div class="bad" id="badbutton"><img src="notbad.png" alt="bad"></div>';
		}
		
	} else if( $topic->state == TopicStates::Old ) {
		// todo print good/bad stats
	}
	echo '</div>';
	
	echo '<div class="replies" id="replies">';
	
	foreach( $topic->comments as $comment ) {
		echo '<div class="reply">';
		echo    $comment->content;
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
		
		?>
		<script>
			$('#replyinput').focus( function() {
				if( $(this).hasClass( 'init' ) ) {
					$(this).removeClass( 'init' );
					$(this).html("");
				}
			});
			
			$("#replyinput").keydown( function() {
				if( loading ) return false;
				setTimeout( replyKeyPressed, 0 );
			});
			$('#replyinput').click( function() {
			
				mb = $('#magicbox');
				var content = $(this).html();
				console.log( content );
				content = content.replace( /<br>/g, '[[br]]' );
				console.log( content );
				mb.html( content );
				console.log( mb.text().replace( /\[\[br\]\]/g, "\n" ) );
				
				
				
			});
			compose_sending = false;
		</script>
		<?php
	}
	
	echo '</div>';
	echo '<div class="submit" onclick="submitComment()" id="submit">submit</div>';
		
	echo '<div class="padding" id="padding"></div>';
	
	
	return true;
}

ShowTopic(); 
?>