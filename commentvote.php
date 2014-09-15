<?php

// commentvote.php POST
//  page = topic id
//  challenge = challenge code
//  comment = comment id
//  vote = "good" or "cancer"

require_once "sql.php";
require_once "config.php";
require_once "util.php";

//-----------------------------------------------------------------------------
function ReadCookieInt( $key ) {
	if( !isset($_COOKIE[$key]) ) return 0;
	return is_numeric($_COOKIE[$key]) ? (int)$_COOKIE[$key] : 0;
}

//-----------------------------------------------------------------------------
try {

	if( !isset( $_POST['page'] ) ||
		!isset( $_POST['challenge'] ) ||
		!isset( $_POST['comment'] ) ||
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
	
	$comment = intval( $_POST['comment'] );
	if( $comment == 0 ) exit( "error" );
	
	$vote = $_POST['vote'];
	$voteval = "";
	if( $vote == "good" ) {
		$voteval = "1";
	}  else if( $vote == "cancer" ) {
		$voteval = "0";
	} else {
		exit( 'error' );
	}
	
	$sql = GetSQL();
	$sql->safequery( "LOCK TABLES Topics READ, Comments READ, CommentVotes WRITE" );
	$result = $sql->safequery( 
		"SELECT 1 FROM Topics ".
		" WHERE id=$page AND challenge=$challenge AND ".
		" state=". TopicStates::Live );
	if( $result->num_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' ); // topic is closed or invalid.
	}
	// slight discrepancy here regarding 
	$xip = GetIPHex();
	
	$result = $sql->safequery( "SELECT 1 FROM Comments WHERE id=$comment AND topic=$page" );
	if( $result->num_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' ); // comment doesn't exist.
	}
	
	$sql->safequery( 
		"INSERT INTO CommentVotes ( commentid, ip, vote ) ".
		" VALUES ( $comment, x'$xip', $voteval ) ".
		" ON DUPLICATE KEY UPDATE vote=$voteval" );
	
	if( $sql->affected_rows == 0 ) {
		$sql->safequery( "UNLOCK TABLES" );
		exit( 'error' );
	}
	$sql->safequery( "UNLOCK TABLES" );
	exit( 'okay.' );
	
} catch ( Exception $e ) {
	throw $e;
}

exit ( "error" );

?>