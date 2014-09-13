<?php

require_once "sql.php";

$sql = GetSQL();

$sql->safequery("DROP TABLE IF EXISTS System" );
$sql->safequery("DROP TABLE IF EXISTS Channels" );
$sql->safequery("DROP TABLE IF EXISTS Topics" );
$sql->safequery("DROP TABLE IF EXISTS Comments" );
$sql->safequery("DROP TABLE IF EXISTS TopicVotes" );
$sql->safequery("DROP TABLE IF EXISTS CommentVotes" );

$sql->safequery(
	"CREATE TABLE IF NOT EXISTS System ( 
		name VARCHAR(8) PRIMARY KEY,
		value VARCHAR(32)  )" );
		
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Channels ( 
		id INT PRIMARY KEY,
		topic INT NOT NULL )" );
		
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Topics (   
		id INT AUTO_INCREMENT PRIMARY KEY ,
		ip VARBINARY(16),          
		state TINYINT NOT NULL,    
		challenge INT NOT NULL,    
		goods INT NOT NULL,
		bads INT NOT NULL, 
		time INT NOT NULL, 
		content VARCHAR(200) NOT NULL )" );

$sql->safequery(
	"CREATE TABLE IF NOT EXISTS Comments (
		id INT AUTO_INCREMENT PRIMARY KEY,
		topic INT NOT NULL,
		ip VARBINARY(16),  
		goods INT NOT NULL,
		bads INT NOT NULL,
		time INT NOT NULL,
		content VARCHAR(200) NOT NULL,
		INDEX USING BTREE(topic) )" );	
		
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS TopicVotes (
		topicid INT,
		ip VARBINARY(16),
		vote BOOL,
			PRIMARY KEY( topicid, ip ) )" );	
			
$sql->safequery(
	"CREATE TABLE IF NOT EXISTS CommentVotes (
		commentid INT,
		ip VARBINARY(16),  
		vote BOOL,
			PRIMARY KEY( commentid, ip ) )" );	
			
?>