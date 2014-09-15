<?php

require_once "config.php";

//-----------------------------------------------------------------------------
abstract class TopicStates {
    const Deleted	= 0;
    const Old		= 1;
    const Composing	= 2;
    const Live		= 3;
}

//-----------------------------------------------------------------------------
class Account {
	public $id;
	public $password;
	public $page;
	public $serial;
	
	public static function FromAssoc( $row ) {
		$account = new Account();
		$account->id = $row['id'];
		$account->password = $row['password'];
		$account->page = $row['page'];
		$account->serial = $row['serial'];
		return $account;
	}
	
	public static function FromArgs( $id, $password, $page, $serial ) {
		$account = new Account();
		$account->id = $id;
		$account->password = $password;
		$account->page = $page;
		$account->serial = $serial;
		return $account;
	}
}

//-----------------------------------------------------------------------------
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
function CreateNewAccount( $sql ) {
	// this function expects the accounts table to be locked.
	
	$password = mt_rand() & 0xFFFFFFF;
	$sql->safequery(
		"INSERT INTO Accounts (password,ip,page,serial)
		VALUES ($password,x'$xip',0,0)" );
	$sql->safequery( "UNLOCK TABLES" );
	$result = $sql->safequery( "SELECT LAST_INSERT_ID()" );
	$row = $result->fetch_row();
	
	$account = Account::FromArgs( $row[0], $password, 0, 0 );
	setcookie( "account", $account->id, time() + 60*60*24*30, $apath );
	setcookie( "password", $account->password, time() + 60*60*24*30, $apath );
	return $account;
}

//-----------------------------------------------------------------------------
function FindOrCreateAccount() {
	// no account cookie, create a new account or use existing one for IP.
	$sql = GetSQL();
	$xip = GetIPHex();
	
	$result = $sql->safequery( "LOCK TABLE Accounts WRITE" );
	
	$result = $sql->safequery( 
		"SELECT id, password, page, serial FROM Accounts WHERE ip=x'$xip'" );
		
	if( $result->num_rows < $ACCOUNTS_PER_IP  ) {
		// create new account
		return CreateNewAccount( $sql );
	} else {
		// use existing account
		
		$choices = array();
		while( $row = $result->fetch_assoc() ) {
			$choices[] = $row;
		}
		
		// this should be above the last loop, but im not sure if it's safe to
		// read a result after another command is executed.
		$sql->safequery( "UNLOCK TABLES" );
		
		$index = mt_rand( 0, count($choices)-1 );
		$account = Account::FromAssoc( $choices[$index] );
		setcookie( "account", $account->id, time() + 60*60*24*30, $apath );
		setcookie( "password", $account->password, time() + 60*60*24*30, $apath );
		return $account;
	}
} 

//-----------------------------------------------------------------------------
function LogIn() {
	$accountid = ReadCookieInt( "account" );
	if( $accountid == 0 ) {
		return FindOrCreateAccount();
	} else {
		// try to log in
		$password = ReadCookieInt( "password" );
		$result = $sql->safequery( 
			"SELECT page, serial FROM Accounts 
			WHERE id=$accountid AND password=$password" );
		
		$row = $result->fetch_row();
		if( !$row ) {
			return FindOrCreateAccount();
		}
		return Account::FromArgs( $accountid, $password, $row[0], $row[1] );
	}
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
			return 1;
		} else {
			FinalizeTopic( $id );
			return 2;
		}
		
	}
	return FALSE;
}

function CheckTopicExpired( $id ) {
	$sql = GetSQL();
	$result =$sql->safequery( 
		"SELECT state,goods,bads,time FROM Topics WHERE id=$id");
	
	$row = $result->fetch_row();
	if( $row === FALSE ) {
		throw new Exception( "Invalid page." );
	}
	if( $row[0] == TopicStates::Old ) return 2;
	if( $row[0] == TopicStates::Deleted ) return 1;
	if( $row[0] != TopicStates::Live ) {
		throw new Exception( "Invalid page." );
	}
	return CheckTopicExpired2( $id, $row[1], $row[2], $row[3] );
}

function GetVoteValue( $source ) {
	if( $source == "good" ) {
		return "1";
	}  else if( $source == "cancer" ) {
		return "0";
	} else {
		return FALSE;
	}
}

?>