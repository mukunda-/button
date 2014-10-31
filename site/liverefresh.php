<?php

// liverefresh.php?serial=x[&last=x][&old]
// page = must match account page
// last = last known comment id
// old = return data for old topics, otherwise returns "expired"
//       and return 'error' if the topic isn't old.

// returns:
// "error" - if the arguments are invalid or an error occurs
// "deleted" - the topic requested was just buried.
// "expired" - if the live version expires and needs a full refresh
// "wrongpage" - a live page is requested, but the user's account isn't
//               on that page.
// comments data - if the topic is still live, the comment data is returned
//  in json format
//  only returns comments with IDs greater than the 'last' param
//

require_once "sql.php";
require_once "config.php";
require_once "util.php";

//-----------------------------------------------------------------------------
try {

	if( !isset( $_GET['page'] ) ) {
		exit( 'error' );
	}
	$page =intval( $_GET['page'] );
	if( $page <= 0 ) {	
		exit( 'error' );
	}
	$lastid = 0;
	if( isset( $_GET['last'] ) ) {
		$lastid = intval($_GET['last']);
	}
	$old = isset( $_GET['old'] );
	$g_account = LogIn();
	 
	$sql = GetSQL();
	
	$result = $sql->safequery(
		'SELECT state FROM Topics WHERE id='.$page );
	
	$row = $result->fetch_row();
	$state = 0;
	if( $row === NULL ) {
		exit( 'error' );
	} else {
		$state = $row[0];
		if( $state != TopicStates::Live && 
				$state != TopicStates::Old ) {
			exit( 'error' );
		}
		
		if( $state == TopicStates::Live ) {
			if( $g_account->page != $page ) {
				exit( 'wrongpage' );
			}
			
			$expired = CheckTopicExpired( $g_account->page );
			if( $expired == 1 ) {
				exit( 'deleted' );
			} else if( $expired == 2 ) {
				if( !$old ) {
					exit( 'expired' );
				}
			} else {
				if( $old ) {
					exit( 'error' );
				}
			}
		} else if( $state == TopicStates::Old ) {
			if( !$old ) {
				exit( 'error' );
			}
		}
	}
	
	$result = $sql->safequery( 
		'SELECT id, content, goods, bads, vote FROM Comments 
		LEFT JOIN CommentVotes 
		ON (commentid=id AND CommentVotes.account='.$g_account->id.')
		WHERE topic='.$page.' AND id > '.$lastid );
	
	$output = array();
	while( $row = $result->fetch_assoc() ) {
		
		$a = array();
		$a['id'] = (int)$row['id'];
		$a['content'] = $row['content'];
		if( $state == TopicStates::Live ) {
			$a['vote'] = is_null($row['vote']) ? NULL : ((boolean)$row['vote']);
		} else {
			$a['vote'] = null;
		}
		if( $state == TopicStates::Old ) {
			$a['goods'] = $row['goods'];
			$a['bads'] = $row['bads'];
		}
		$output[] = $a;
	}
	
	if( $state == TopicStates::Old ) {
	
		foreach( $output as $key => $value ) {
			$score = GetScore( $value['goods'], $value['bads'] );
			if( $score < $GLOBALS['COMMENT_BURY_SCORE'] ) {
				// filter out shit scores.
				unset( $output[$key] );
			} else {
				// translate goods,bads into final score
				$output[$key]['score'] = $score;
				unset( $output[$key]['goods'] );
				unset( $output[$key]['bads'] );
			}
		}
		
		// sort by score
		usort( $output, "ScoreCmp2" );
		
	} else if( $state == TopicStates::Live ) {
	
		// filter out downvoted comments
		foreach( $output as $key => $value ) {
			if( $value['vote'] === FALSE ) {
				unset( $output[$key] );
			}
		}
		// sort randomly
		shuffle( $output );
	}
		
	echo json_encode( $output );
	exit();
	
} catch ( Exception $e ) {
	LogException( "liverefresh", $e );

}
exit( 'error' );

?>