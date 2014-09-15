<?php

require_once "config.php";

//-----------------------------------------------------------------------------
abstract class TopicStates {
    const Deleted	= 0;
    const Old		= 1;
    const Composing	= 2;
    const Live		= 3;
}

// compares two entries with values "goods" (good votes) and "bads" (bad votes)
function ScoreCmp( $a, $b ) {
	$c = $a['goods'] - $a['bads'];
	$d = $b['goods'] - $b['bads'];
	if( $c == $d ) return 0;
	return ($c>$d) ? -1 : 1;
}
	
//-----------------------------------------------------------------------------
function ReadCookieInt( $key ) {
	if( !isset($_COOKIE[$key]) ) return 0;
	return is_numeric($_COOKIE[$key]) ? (int)$_COOKIE[$key] : 0;
}

//-----------------------------------------------------------------------------
function GetIPHex() {
	return bin2hex(inet_pton( $_SERVER['REMOTE_ADDR'] ));
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
function CheckTopicExpired2( $id, $goods, $bads, $time ) {
	$totalvotes = (float)( $goods + $bads );
	if( $totalvotes == 0 ) $totalvotes=1.0;
	$score = (float)$goods / $totalvotes;
	$removetime = 0; 
	$delete = false;
	
	if( $score < 0.6 ) {
		// under score 60, delete after 5 minutes
		// remove after 5 minutes
		$removetime = $GLOBALS['BURY_TIME'];
		$delete = true;
	} else {
		// "old" after 30 minutes
		$removetime = $GLOBALS['OLD_TIME'];
	}
	
	if( time() >= ($time + $removetime) ) {
		
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

function CheckTopicExpired( $id, $challenge ) {
	$sql = GetSQL();
	$result =$sql->safequery( 
		"SELECT goods,bads,time FROM Topics WHERE id=$id AND challenge=$challenge");
	
	$row = $result->fetch_row();
	if( $row === FALSE ) return false;
	return CheckTopicExpired2( $id, $row[0], $row[1], $row[2] );
}

?>