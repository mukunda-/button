<?php

// topicvote.php POST
//  serial = account serial
//  vote = "good" or "cancer"

// returns:
//   "error": the page should be reloaded
//   "good" : user voted good
//   "cancer"  : user voted cancer, reload content.
//   "expired" : topic is expired., can only return this if user votes GOOD

require_once "sql.php";
require_once "config.php";
require_once "util.php";


//-----------------------------------------------------------------------------
try {
	if( !isset( $_POST['serial'] ) ) {
		exit( 'error' );
	}
	
	$voteval = GetVoteValue( $_POST['vote'] );
	if( $voteval === FALSE ) exit( 'error' );
	
	$g_account = LogIn();
	if( $g_account->serial != $_POST['serial'] ) {
		exit( 'wrongpage' );
	}
	
	if( CheckTopicExpired( $g_account->page ) ) {
		exit( 'expired' ); // topic has expired.
	}
	
	$sql = GetSQL();
	$sql->safequery( 
		'LOCK TABLES Topics WRITE, TopicVotes WRITE' );
	$result = $sql->safequery( 
		'SELECT state FROM Topics WHERE id='.$g_account->page );
	
	if( $result->num_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' ); // topic is invalid.
	}
	
	$row = $result->fetch_row();
	if( $row[0] == TopicStates::Old ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'expired' ); // topic is closed.
	}
	
	if( $row[0] != TopicStates::Live ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' ); // topic is invalid.
	}
	
	$sql->safequery( 
		'INSERT IGNORE INTO TopicVotes ( topicid, account, vote ) 
		VALUES ( '.$g_account->page.', '.$g_account->id.", $voteval )" );
		
	if( $sql->affected_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' ); // user already voted.
	}
	
	if( $voteval == '1' ) {
		$sql->safequery( 
			'UPDATE Topics SET goods=goods+1 WHERE id='.$g_account->page );
	} else if( $voteval == '0' ) {
		$sql->safequery( 
			'UPDATE Topics SET bads=bads+1 WHERE id='.$g_account->page );
	}
	$sql->safequery( 'UNLOCK TABLES' );
	
	if( $voteval == '1' ) {
		exit( 'good' );
	} else if( $voteval == '0' ) {
		exit( 'cancer' );
	}
	
} catch( Exception $e ) {
	
}
exit( 'error' );
?>