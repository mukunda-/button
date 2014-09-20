<?php

require_once "config.php";
require_once "util.php";

if( !isset($DEBUG) || (!$DEBUG) ) die();

require_once "sql.php";


$sql = GetSQL();

$sql->safequery("DROP TABLE IF EXISTS System" );
//$sql->safequery("DROP TABLE IF EXISTS Channels" );
$sql->safequery("DROP TABLE IF EXISTS Topics" );
$sql->safequery("DROP TABLE IF EXISTS Comments" );
$sql->safequery("DROP TABLE IF EXISTS TopicVotes" );
$sql->safequery("DROP TABLE IF EXISTS CommentVotes" );
$sql->safequery("DROP TABLE IF EXISTS Accounts" );
$sql->safequery("DROP TABLE IF EXISTS ArchiveIndex" );

$sql->safequery(
	"CREATE TABLE IF NOT EXISTS System ( 
		name VARCHAR(8) PRIMARY KEY,
		value VARCHAR(32)  )" );
		
//$sql->safequery(
//	"CREATE TABLE IF NOT EXISTS Channels ( 
//		id INT PRIMARY KEY,
//		topic INT NOT NULL )" );
		
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Topics (   
		id INT AUTO_INCREMENT PRIMARY KEY,
		account INT NOT NULL,
		state TINYINT NOT NULL, 
		goods INT NOT NULL DEFAULT 0,
		bads INT NOT NULL DEFAULT 0,
		time INT NOT NULL,
		content VARCHAR(200) NOT NULL )" );

$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Comments (
		id INT AUTO_INCREMENT PRIMARY KEY,
		topic INT NOT NULL,
		account INT NOT NULL,
		goods INT NOT NULL,
		bads INT NOT NULL,
		time INT NOT NULL,
		content VARCHAR(200) NOT NULL,
		INDEX USING BTREE(topic) )" );
 
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS TopicVotes (
		topicid INT,
		account INT,
		vote BOOL,
			PRIMARY KEY( topicid, account ) )" );	
 
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS CommentVotes (
		commentid INT,
		account INT,
		vote BOOL,
			PRIMARY KEY( commentid, account ) )" );	
			
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Accounts (
		id INT AUTO_INCREMENT PRIMARY KEY,
		password INT NOT NULL,
		ip VARBINARY(16) NOT NULL,
		page INT NOT NULL DEFAULT 0,
	
		lastreply INT NOT NULL DEFAULT 0,
		lastcompose INT NOT NULL DEFAULT 0,
		INDEX USING BTREE(ip) )" );
		
		
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS ArchiveIndex (
		id INT AUTO_INCREMENT PRIMARY KEY,
		page INT NOT NULL )" );
		

//----------------------------------------------------------------------------
function AddTestPage() {
	$cont = "";
	for( $i = 0; $i < 35; $i++ ) {
		$cont .= chr( mt_rand(32,126) );
	}
	$sql = GetSQL();
	$cont = $sql->real_escape_string( $cont );
	$sql->safequery( 
		"INSERT INTO Topics (account,state,time,content) 
		VALUES ( 0,".TopicStates::Old.",".time().",'$cont' )" );
		
	$result = $sql->safequery( "SELECT LAST_INSERT_ID()" );
	$row = $result->fetch_row();
		
	$sql->safequery(
		"INSERT INTO ArchiveIndex (page) VALUES (".$row[0].")" );
}
/*
//----------------------------------------------------------------------------
for( $i = 0; $i < 35; $i++ ) {
	AddTestPage();
}*/
 
?>