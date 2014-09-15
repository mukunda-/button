<?php

// getcomments.php?page=x&challenge=x&[last=x]
// page = topic id               must match cookie
// challenge = topic challenge   must match cookie
// last = last known comment id

require_once "sql.php";
require_once "config.php";
require_once "util.php";

//-----------------------------------------------------------------------------
function ReadCookieInt( $key ) {
	if( !isset($_COOKIE[$key]) ) return 0;
	return is_numeric($_COOKIE[$key]) ? (int)$_COOKIE[$key] : 0;
}

function ScoreCmp( $a, $b ) {
	$c = $a['goods'] - $a['bads'];
	$d = $b['goods'] - $b['bads'];
	if( $c == $d ) return 0;
	return ($c>$d) ? -1 : 1;
}
	

//-----------------------------------------------------------------------------
try {

	if( !isset( $_GET['page'] ) ||
		!isset( $_GET['challenge'] ) ||
			!isset($_COOKIE['challenge']) || 
			!isset($_COOKIE['page']) ) {
		
		exit( 'error' );
	}
	
	$lastid = 0;
	if( isset( $_GET['last'] ) ) {
		$lastid = intval($_GET['last']);
	}
	$challenge = ReadCookieInt( 'challenge' );
	$page = ReadCookieInt( 'page' );
	if( $challenge != $_GET['challenge'] ||
		$page != $_GET['page'] ) {
		
		exit( 'error' );
	}
	$sql = GetSQL();
	
	$result = $sql->safequery( "SELECT state FROM Topics WHERE id=$page" );
	
	$row = $result->fetch_row();
	$state = 0;
	if( $row === FALSE ) {
		throw new Exception( 'error' );
	} else {
		$state = $row[0];
		if( $state != TopicStates::Live && $state != TopicStates::Old ) {
			exit( 'error' );
			
		}
	}
	
	$ip = GetIPHex();
	
	$result = $sql->safequery( 
		"SELECT id, content, goods, bads, vote FROM Comments ".
		" LEFT JOIN CommentVotes ON (commentid=id AND CommentVotes.ip=x'$ip') ".
		" WHERE topic=$page AND id > $lastid" );
	
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