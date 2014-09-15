<?php


// topicvote.php POST
//  page = topic id
//  challenge = challenge code
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
	if( !isset( $_POST['page'] ) ||
		!isset( $_POST['challenge'] ) || 
		!isset( $_POST['vote'] ) ||
			!isset($_COOKIE['challenge']) || 
			!isset($_COOKIE['page']) ) {
		
		exit( 'error' );
	}
	
	$challenge = ReadCookieInt( 'challenge' );
	$page = ReadCookieInt( 'page' );
	if( $challenge != $_POST['challenge'] ||
		$page != $_POST['page'] ) {
		
		exit( 'error' );
	}
	
	$voteval = GetVoteValue( $_POST['vote'] );
	if( $voteval === FALSE ) exit( 'error' );
	
	
	if( CheckTopicExpired( $page, $challenge ) ) {
		exit( 'expired' ); // topic has expired.
	}
	
	$xip = GetIPHex();
	
	$sql = GetSQL();
	$sql->safequery( 
		"LOCK TABLES Topics WRITE, TopicVotes WRITE" );
	$result = $sql->safequery( 
		"SELECT state FROM Topics WHERE id=$page AND challenge=$challenge" );
	
	if( $result->num_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' ); // topic is closed or invalid.
	}
	
	$row = $result->fetch_row();
	if( $row[0] == TopicStates::Old ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'expired' ); // topic is closed or invalid.
	}
	if( $row[0] != TopicStates::Live ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' ); // topic is closed or invalid.
	}
	
	$sql->safequery( 
		"INSERT IGNORE INTO TopicVotes ( topicid, ip, vote ) VALUES
		( $page, x'$xip', $voteval )" );
		
	if( $sql->affected_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' ); // user already voted.
	}
	
	if( $voteval == '1' ) {
		$sql->safequery( 
			"UPDATE Topics SET goods=goods+1 WHERE id=$page" );
	} else if( $voteval == '0' ) {
		$sql->safequery( 
			"UPDATE Topics SET bads=bads+1 WHERE id=$page" );
	}
	$sql->safequery( "UNLOCK TABLES" );
	
	if( $voteval == '1' ) {
		exit( 'good' );
	} else if( $voteval == '0' ) {
		exit( 'cancer' );
	}
	
} catch( Exception $e ) {
	throw $e; // TODO/DEBUG
}
exit( 'error' );
?>