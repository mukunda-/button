<?php

// commentvote.php POST
//  serial = account serial
//  comment = comment id
//  vote = "good" or "cancer"

// returns "okay." or "error"

require_once "sql.php";
require_once "config.php";
require_once "util.php";

//-----------------------------------------------------------------------------
try {

	if( !isset( $_POST['serial'] ) || 
		!isset( $_POST['comment'] ) ||
		!isset( $_POST['vote'] ) ) {
		
		exit( 'error' );
	}
	
	$voteval = GetVoteValue( $_POST['vote'] );
	if( $voteval === FALSE ) exit( 'error' );
	$comment = intval( $_POST['comment'] );
	if( $comment == 0 ) exit( 'error' );
	
	$g_account = LogIn();
	if( $g_account->serial != $_POST['serial'] ) {
		exit( 'error' );
	}
	 
	$sql = GetSQL();
	$sql->safequery( 
		'LOCK TABLES Topics READ, Comments READ, CommentVotes WRITE' );
	$result = $sql->safequery( 
		'SELECT 1 FROM Topics
		WHERE id='.$g_account->page.' 
		AND state='. TopicStates::Live );
		
	if( $result->num_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' ); // topic is closed or invalid.
	}
	
	$result = $sql->safequery( 
		"SELECT 1 FROM Comments WHERE id=$comment AND topic=".$g_account->page );
		
	if( $result->num_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' ); // comment doesn't exist.
	}
	
	$sql->safequery( 
		"INSERT INTO CommentVotes ( commentid, account, vote )
		VALUES ( $comment, ".$g_account->id.", $voteval )
		ON DUPLICATE KEY UPDATE vote=$voteval" );
	
	if( $sql->affected_rows == 0 ) {
		$sql->safequery( 'UNLOCK TABLES' );
		exit( 'error' );
	}
	$sql->safequery( 'UNLOCK TABLES' );
	exit( 'okay.' );
	
} catch ( Exception $e ) {	
	LogException( "commentvote", $e );
	
}

exit ( "error" );

?>