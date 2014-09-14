<?php

require_once "sql.php";
require_once "topic_states.php";
require_once "config.php";
require_once "util.php";
 /*
//-----------------------------------------------------------------------------
class Comment {
	public $id;
	public $content;
	public $goods;
	public $bads;
	public $vote; // true, false, or NULL
	public $time;
	
	public function __construct( $row ) {
		// create from SQL row
		
		$this->id = $row['id'];
		$this->content = $row['content'];
		$this->goods = $row['goods'];
		$this->bads = $row['bads'];
		$this->time = $row['time'];
		$this->vote = $row['vote'];
	}
}*/

//-----------------------------------------------------------------------------
class Topic {
	public $id;
	public $ip;
	public $content = "";
	public $state;
	//public $comments = array();
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
		/*
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
		}*/
	}
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
		"SELECT state,time, goods,bads FROM Topics WHERE id=$page AND challenge=$challenge");
	
	$row = $result->fetch_assoc();
	if( $row === FALSE ) return false;
	// TODO make sure they get a new topic on the next refresh.
	if( $row['state'] == TopicStates::Deleted ) {
		setcookie( "page", 0, 0, $apath );
		return true;
	}
	if( $row['state'] == TopicStates::Composing && time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT'] ) ) {
		// delete composition, they took too long.
		$sql->safequery( 
			"DELETE FROM Topics WHERE id=$page AND state=".TopicStates::Composing );
		return false;
	}
	
	if( $row['state'] == TopicStates::Live ) {
		if( CheckTopicExpired( $page, $row['goods'], $row['bads'], $row['time'] ) ) {
			return true;
		}
		
	}
	return true;
}

//-----------------------------------------------------------------------------
function FinalizeTopic( $id ) {
	$sql = GetSQL();
	$sql->safequery( 
			"LOCK TABLES ".
			"Topics WRITE, Comments WRITE, CommentVotes READ" );
	
	$sql->safequery(
			"UPDATE Topics SET state=".TopicStates::Old.
			" WHERE state=".TopicStates::Live." AND id=$id" );
	
	if( $sql->affected_rows == 0 ) {
		// the topic was already finalized
		$sql->safequery( "UNLOCK TABLES" );
		return;
	}
	
	// get total of comment votes and assign them to the 
	// comment entries
	$sql->safequery( "
		 UPDATE Comments LEFT JOIN 
		  (SELECT commentid, 
				  SUM(vote) AS goods, 
				  SUM(1-vote) AS bads 
				  FROM CommentVotes GROUP BY commentid
		  ) AS VoteTotals 
		 ON Comments.id = VoteTotals.commentid 
		 SET Comments.goods = IFNULL(VoteTotals.goods,0), 
		     Comments.bads = IFNULL(VoteTotals.bads,0) 
		 WHERE topic = $id" );
		 
	$sql->safequery( "UNLOCK TABLES" );
}

//-----------------------------------------------------------------------------
function CheckTopicExpired( $id, $goods, $bads, $time ) {
	$totalvotes = (float)( $goods + $bads );
	if( $totalvotes == 0 ) $totalvotes=1.0;
	$score = (float)$goods / $totalvotes;
	$removetime = 0; 
	$delete = false;
	
	if( $score < 0.6 ) {
		// under score 60, delete after 5 minutes
		// remove after 5 minutes
		$removetime = 60*5;
		$delete = true;
	} else {
		// "old" after 30 minutes
		$removetime = 60*30;
	}
	
	if( time() >= ($row['time'] + $removetime) ) {
		
		// topic expired.
		if( $delete ) {
			$sql = GetSQL();
			$sql->safequery( 
			"UPDATE Topics SET state=".TopicStates::Deleted.
			" WHERE state=".TopicStates::Live." AND id=$id" );
		} else {
			FinalizeTopic( $id );
		}
		return true;
	}
	return false;
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
		"SELECT id,state,time,vote,goods,bads FROM Topics ".
		" LEFT JOIN TopicVotes ON (topicid=id AND TopicVotes.ip=x'$xip')".
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
		if( $row['state'] == TopicStates::Composing ) {
			if( time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT']) ) {
				// delete timed-out composition.
				// we double-check that it is still in composition mode.
				$sql->safequery( "DELETE FROM Topics WHERE id=".$row['id']." AND state=$s_comp" );
				continue;
			}
		} else if( $row['state'] == TopicStates::Live ) {
		
			if( CheckTopicExpired( $row['id'], $row['goods'], 
									$row['bads'], $row['time'] ) ) {
				
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

if( !IsPageValid( $g_page, $g_challenge ) ) {
	$g_page = 0;
}

if( $g_page == 0 ) {
	// try to find a new page
	
	GetNewPage();
	// at this point mypage is valid
	// and 0 is valid which means "no page available."
}
 

function ShowTopic() {
	global $g_page, $g_challenge;
	
	echo '<script>';
	echo "g_page      = $g_page;";
	echo "g_challenge = $g_challenge;";
	echo '</script>';
	
	
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
				if( g_loading ) return false;
				setTimeout( compositionKeyPressed, 0 );
			});
			g_compose_sending = false;
		</script>
		
		<?php
		return true;
	}
	
	$badstring = mt_rand( 0, 25 ) == 0 ? "cancer": "bad";
	echo '<div class="topic" id="topic">';
	echo $topic->content;
	if( $topic->state == TopicStates::Live ) {
		echo '<script>g_topic_state="live"</script>';
		if( $topic->vote === true ) {
			echo '<div class="good" id="goodbutton"><img src="star.png" alt="good" title="good"></div>';
			echo '<div class="bad" id="badbutton"><img src="notbad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		} else if( $topic->vote === false ) {
			echo '<div class="good" id="goodbutton"><img src="unstar.png" alt="good" title="good"></div>';
			echo '<div class="bad" id="badbutton"><img src="bad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		} else {
			echo '<div class="good" id="goodbutton" onclick="voteTopicGood()"><img src="unstar.png" alt="good" title="good"></div>';
			echo '<div class="bad" id="badbutton" onclick="voteTopicBad()"><img src="notbad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		}
		 
		
	} else if( $topic->state == TopicStates::Old ) {
		echo '<script>g_topic_state="old"</script>';
		// print score
	}
	echo '</div>';
	
	echo '<div class="replies" id="replies">';
	echo     '<div class="replylist" id="replylist">';
	/*
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
		echo '</div>'; // reply
	}*/
	echo '</div>'; // replylist
	
	if( $topic->state == TopicStates::Live ) {
		echo '<div class="reply" id="replyinputbox">
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
				if( g_loading ) return false;
				setTimeout( replyKeyPressed, 0 );
			});
			 
			g_compose_sending = false;
			g_last_comment = 0;
			g_num_replies = 0;
			g_refreshing_comments = false;
			refreshComments();
		</script>
		
		<?php
	}
	
	echo '</div>'; // replies
	
	
	echo '<div class="submit" onclick="submitComment()" id="submit">submit</div>';
		
	echo '<div class="padding" id="padding"></div>';
	
	
	return true;
}

ShowTopic(); 
?>