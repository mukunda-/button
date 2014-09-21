<?php
require_once 'config.php'; 
require_once 'minify.php';
require_once 'htaccess.php';

?>
<!DOCTYPE html>
<html>
<head>
	
	<!-- testing playground for contenteditable input -->
	
	
	<meta charset="UTF-8">
	<link rel="shortcut icon" href="/favicon.png">
	<link href='http://fonts.googleapis.com/css?family=Noto+Sans:400,700,400italic' rel='stylesheet' type='text/css'>

	<link rel="stylesheet" href="min/style.min.css" type="text/css">
	
	<?php 
		function AddScript( $src ) {
			echo '<script src="'.$src.'"></script>';
		}
		
		AddScript( '//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js' );
	?>
	
	
	<title>TEST2</title>
	
</head>
<body>	
	<div id="magicbox"></div>
	<div id="loader_window" class="hidden"><div id="loader"><img src="ajax-loader.gif"></div></div>
	<div id="help" onclick="matbox.ShowHelp()">?</div>
	<div id="content">
		<div class="topic composing" id="topic">
			<div class="compose" contenteditable="true" id="composition"></div>
		</div>
		<button onclick="test()">test</button>

		<script>
			//-----------------------------------------------------------------------------
			// read element text with converted line breaks
			function ReadText( element ) {
				// TODO fix trailing space bug
				// invisible "workspace" element
				mb = $('#magicbox'); 
				
				// copy over the html, with replaced <br> tags
				var content = $(element).html(); 
				content = content.replace( /<br>/g, '[[br]]' ); 
				console.log( content );
				mb.html( content );
				
				// return the raw text
				return mb.text().trim();
			}
			
			function test() {
				console.log( ReadText( $("#topic") ) );
			}
			
			$("#content").css( 'opacity', 1);
		</script>
	</div>
	<div id="navigation"></div>
</body>
</html>