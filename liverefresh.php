<?php

// liverefresh.php?serial=x[&last=x][&old]
// serial = account serial       must match account serial
// last = last known comment id
// old = return data for old topics, otherwise returns "expired"
//       and return 'error' if the topic isn't old.

// returns:
// "error" - if the arguments are invalid or an error occurs
// "expired" - if the live version expires and needs a full refresh
// comments data - if the topic is still live, the comment data is returned
//  in json format
//  only returns comments with IDs greater than the 'last' param
//

require_once "sql.php";
require_once "config.php";
require_once "util.php";

//-----------------------------------------------------------------------------
try {

	if( !isset( $_GET['serial'] ) ||
		exit( 'error' );
	}
	$lastid = 0;
	if( isset( $_GET['last'] ) ) {
		$lastid = intval($_GET['last']);
	}
	$old = isset( $_GET['old'] );
	$g_account = LogIn();
	if( $g_account->serial != $_GET['serial'] ) {
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
	
	$sql = GetSQL();
	
	$result = $sql->safequery(
		'SELECT state FROM Topics WHERE id='.$g_account->page );
	
	$row = $result->fetch_row();
	$state = 0;
	if( $row === FALSE ) {
		exit( 'error' );
	} else {
		$state = $row[0];
		if( $state != TopicStates::Live && 
				$state != TopicStates::Old ) {
			exit( 'error' );
		}
	}
	
	$result = $sql->safequery( 
		'SELECT id, content, goods, bads, vote FROM Comments 
		LEFT JOIN CommentVotes 
		ON (commentid=id AND CommentVotes.account='.$g_account->id.')
		WHERE topic='.$g_account->page.' AND id > '.$lastid );
	
	$output = array();
	while( $row = $result->fetch_assoc() ) {
		
		$a = array();
		$a['id'] = $row['id'];
		$a['content'] = $row['content'];
		$a['vote'] = is_null($row['vote']) ? NULL : ((boolean)$row['vote']);
		if( $state == TopicStates::Old ) {
			$a['goods'] = $row['goods'];
			$a['bads'] = $row['bads'];
		}
		$output[] = $a;
	}
	
	if( $state == TopicStates::Old ) {
		// sort by score
		usort( $output, ScoreCmp );
	} else if( $state == TopicStates::Live ) {
		// sort randomly
		shuffle( $output );
	}
		
	echo json_encode( $output );
	exit();
	
} catch ( Exception $e ) {

}
exit( 'error' );

?>