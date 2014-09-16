<?php

require_once "sql.php";
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
0		$this->time = $row['time'];
		$this->vote = $row['vote'];
	}
}*/

//-----------------------------------------------------------------------------
class Topic {
	public $id;
	public $accountid;
	public $content = "";
	public $state;
	//public $comments = array();
	public $goods;
	public $bads;
	public $vote; // the vote for this account, TRUE, FALSE, or NULL
	public $time;
	public $valid;
	
	public function __construct( $account ) {
		$this->id = $account->page;
		$this->valid = false;
		
		$sql = GetSQL();
		$result = $sql->safequery(
			'SELECT Topics.account, state, goods, bads, time, content, vote FROM Topics 
			LEFT JOIN TopicVotes ON (topicid=id AND TopicVotes.account='.$account->id.') 
			WHERE id='.$account->page );
		
		$row = $result->fetch_assoc();
		if( $row === FALSE ) return; 
		$state = $row['state'];
		$this->state = $state;
		$this->accountid = $row['account'];
		$this->content = $row['content'];
		$this->goods = $row['goods'];
		$this->bads = $row['bads'];
		$this->vote = is_null($row['vote']) ? null : ($row['vote'] == 1 ? TRUE:FALSE);
		$this->time = $row['time'];
		$this->valid = true;
	}
}


//-----------------------------------------------------------------------------
function SaveAccount( $account, $page, $serial ) {
	$sql = GetSQL(); 
	$sql->safequery( 
		'UPDATE Accounts SET page='.$page.', 
		serial='.$serial.' WHERE id='.$account->id );
}

//-----------------------------------------------------------------------------
function IsPageValid( $account ) {
	if( $account->page == 0 ) return false;
	
	global $apath;
	$sql = GetSQL();
	$result =$sql->safequery( 
		'SELECT state,time,goods,bads,vote FROM Topics 
		LEFT JOIN TopicVotes ON (topicid=id AND TopicVotes.account='.$account->id.')
		WHERE id='.$account->page );
	
	$row = $result->fetch_assoc();
	if( $row === FALSE ) return false;
	
	if( (!is_null( $row['vote'] )) && $row['vote'] == 0 ) {
		// downvoted post, don't show.
		return false;
	}
	// TODO make sure they get a new topic on the next refresh.
	if( $row['state'] == TopicStates::Deleted ) {
		SaveAccount( $account, 0, $account->serial+1 );
		return true;
	}
	if( $row['state'] == TopicStates::Composing && time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT'] ) ) {
		// delete composition, they took too long.
		$sql->safequery( 
			'DELETE FROM Topics WHERE id='.$account->page.' AND state='.TopicStates::Composing );
		return false;
	}
	
	if( $row['state'] == TopicStates::Live ) {
		$result = CheckTopicExpired2( $account->page, $row['goods'], $row['bads'], $row['time'] );
		if( $result ) {
			if( $result == 1 ) {
				// deleted. choose new topic on next refresh.
				SaveAccount( $account, 0, $account->serial+1 );
			}
			return true;
		}
	}
	return true;
}


//-----------------------------------------------------------------------------
function GetNewPage() {
	global $SLOTS, $g_account, $apath;
	
	$sql = GetSQL();
	$result = $sql->safequery( 
		"LOCK TABLES Topics WRITE, TopicVotes READ, Accounts WRITE" );
	 
	$result = $sql->safequery( 
		'SELECT id,state,time,vote,goods,bads FROM Topics
		LEFT JOIN TopicVotes 
		ON (topicid=id AND TopicVotes.account='.$g_account->id.')
		WHERE (state='.TopicStates::Live.' 
		OR state='.TopicStates::Composing.') 
		LIMIT '.$SLOTS );
	
	if( $result->num_rows < $SLOTS ) {
	
		if( time() > ($g_account->lastcompose + $GLOBALS['COMPOSE_DELAY']) ) {
			// chance to make a new 
			//if( mt_rand( 0, $SLOTS-1 ) >= $result->num_rows ) {
			
			// start new composition 
			$sql->safequery( 
				'INSERT INTO Topics ( account,state,goods,bads,time ) VALUES 
				( '.$g_account->id.', '.TopicStates::Composing.', 0, 0, '.time().')' );
	
			$result = $sql->safequery( 'SELECT LAST_INSERT_ID()' );
			$row = $result->fetch_row();
			$g_account->page = $row[0];
			$g_account->serial++;
			$g_account->lastcompose = time();
			$sql->safequery( 
				'UPDATE Accounts SET page='.$g_account->page.', 
				serial='.$g_account->serial.', lastcompose='.$g_account->lastcompose.' 
				WHERE id='.$g_account->id );
			//SaveAccount( $g_account, $g_account->page, $g_account->serial );
			
			$sql->safequery( 'UNLOCK TABLES' );
			return;
			
			//}
		}
	}
	$sql->safequery( 'UNLOCK TABLES' );
	
	$choices = array();
	
	while( $row = $result->fetch_assoc() ) {
		if( $row['state'] == TopicStates::Composing ) {
			if( time() >= ($row['time'] + $GLOBALS['COMPOSE_TIMEOUT']) ) {
				// delete timed-out composition.
				// we double-check that it is still in composition mode.
				$sql->safequery( 
					'DELETE FROM Topics WHERE id='.$row['id'].' AND state='.TopicStates::Composing );
				continue;
			}
		} else if( $row['state'] == TopicStates::Live ) {
			

			if( CheckTopicExpired2( $row['id'], $row['goods'], 
									$row['bads'], $row['time'] ) ) {
				
				continue;
			}
			
			
			// skip downvoted topics.
			if( (!is_null( $row['vote'] )) && $row['vote'] == 0 ) {
				continue;
			}
			
			
			$choices[] = $row['id']; 
			
		}
	}
	
	if( empty( $choices ) ) { 
		
		$g_account->page = 0;
		$g_account->serial++;
		SaveAccount( $g_account, 0, $g_account->serial );
		return;
	}
	
	$choice = $choices[mt_rand( 0, count($choices)-1 )];
	
	$g_account->page = $choice;
	$g_account->serial++;
	SaveAccount( $g_account, $g_account->page, $g_account->serial );
}

try {
	$g_account = LogIn();

	if( !IsPageValid( $g_account ) ) {
		$g_account->page = 0;
	}

	if( $g_account->page == 0 ) {
		// try to find a new page
		
		GetNewPage();
		// at this point mypage is valid
		// and 0 is valid which means "no page available."
	}
} catch( Exception $e ) {
	echo '
			<div class="topic nothing" id="topic" onclick="Button.RefreshFromNothing()">
				something messed up.
			</div>';
	LogException( "getnewpage", $e );
	
	die();
}

function ScoreRank( $a) {
	if( $a < 60 ) return "rank_cancer";
	if( $a < 70 ) return "rank_poop";
	if( $a < 80 ) return "rank_ok";
	if( $a < 90 ) return "rank_good";
	if( $a < 99 ) return "rank_great";
	return "rank_god";
	
}
	
function ShowTopic() {
	global $g_account;
	
	echo '<script>';
	echo 'Button.SetSerial( '.$g_account->serial.' );';
	echo 'Button.SetTopicState("none");';
	echo '</script>';
	 
	if( $g_account->page == 0 ) {
		echo '
			<div class="topic nothing" id="topic" onclick="Button.RefreshFromNothing()">
				nothing here. come back later.
			</div>';
		return false;
	}
	
	try {
		$topic = new Topic( $g_account );
	} catch( Exception $e ) {
		echo '
			<div class="topic nothing" id="topic" onclick="Button.RefreshFromNothing()">
				something messed up.
			</div>';
		LogException( "readtopic", $e );
		die();
	}
	
	if( !$topic->valid ) {
		echo '
			<div class="topic nothing" id="topic" onclick="Button.RefreshFromNothing()">
				nothing here. come back later.
			</div>';
		return false;
	}
	
	if( $topic->state == TopicStates::Deleted ) {
		echo '
			  <div class="topic nothing" id="topic" onclick="Button.RefreshFromNothing()">
			  	  this matter was buried.
			  </div>';
		return false;
	}
	
	if( $topic->state == TopicStates::Composing ) {
		echo '<div class="topic composing" id="topic">
				<div class="compose" contenteditable="true" id="composition"></div>
			  </div>';
			  
		echo '<div class="submit" onclick="Button.SubmitComposition()" id="submit">analyze</div>';
		
		?>
		
		<script>
			$("#composition").keydown( function() {
				if( Button.IsLoading() ) return false;
				setTimeout( Button.CompositionKeyPressed, 0 );
			});
		</script>
		
		<?php
		return true;
	}
	
	$badstring = mt_rand( 0, 25 ) == 0 ? "cancer": "bad";
	echo '<div class="topic" id="topic">';
	echo $topic->content;
	if( $topic->state == TopicStates::Live ) {
		echo '<script>Button.SetTopicState("live")</script>';
		if( $topic->vote === true ) {
			echo '<div class="good" id="goodbutton"><img src="star.png" alt="good" title="good"></div>';
			echo '<div class="bad" id="badbutton"><img src="notbad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		} else if( $topic->vote === false ) {
			echo '<div class="good" id="goodbutton"><img src="unstar.png" alt="good" title="good"></div>';
			echo '<div class="bad" id="badbutton"><img src="bad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		} else {
			echo '<div class="good clickable" id="goodbutton" onclick="Button.VoteTopicGood()"><img src="unstar.png" alt="good" title="good"></div>';
			echo '<div class="bad clickable" id="badbutton" onclick="Button.VoteTopicBad()"><img src="notbad.png" alt="'.$badstring.'" title="'.$badstring.'"></div>';
		}
		
	} else if( $topic->state == TopicStates::Old ) {
		echo '<script>Button.SetTopicState("old")</script>';
		// print score
		$score = GetScore($topic->goods,$topic->bads);
		echo '<div class="score '.ScoreRank($score).'" id="scorediv">'.$score.'</div>';
		echo '<div class="new" id="newbutton" onclick="Button.CloseOld()"></div>';
	}
	echo '</div>';
	
	echo '<div class="replies" id="replies">';
	echo     '<div class="replylist" id="replylist">';
 
	echo '</div>'; // replylist
	
	if( $topic->state == TopicStates::Live ) {
		echo '<div class="reply" id="replyinputbox">
				 <div class="replyinput init" id="replyinput" contenteditable="true"></div>
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
				if( Button.IsLoading() ) return false;
				setTimeout( Button.ReplyKeyPressed, 0 );
			});
			  
			Button.DoLiveRefresh();
		</script>
		
		<?php
	} else if( $topic->state == TopicStates::Old ) {
		?><script>
			Button.DoLiveRefresh();
		</script><?php
	}
	
	echo '</div>'; // replies
	
	
	echo '<div class="submit" onclick="Button.SubmitComment()" id="submit">submit</div>';
		
	echo '<div class="padding" id="padding"></div>';
	
	
	return true;
}

ShowTopic(); 

?>