
var loading = false;
var loading_fading_out = false;
var loading_page_content = null;
var compose_sending = false;

var FADE_OUT_TIME = 500; 
var FADE_IN_TIME = 500;

//-----------------------------------------------------------------------------
// read element text with converted line breaks
function readText( element ) {

	// invisible "workspace" element
	mb = $('#magicbox'); 
	
	// copy over the html, with replaced <br> tags
	var content = $(element).html(); 
	content = content.replace( /<br>/g, '[[br]]' ); 
	mb.html( content );
	
	// return the raw text
	return mb.text().trim();
}

//-----------------------------------------------------------------------------
function submitComposition() {
	if( loading ) return false;
	if( compose_sending ) return false;
	if(  $('#composition').text().trim() == "" ) {
		return false;
	}
	
	var content = readText( $('#composition') );  
	
	compose_sending = true;
	$("#composition").attr('contentEditable', false);
	$("#composition").removeClass('composing');
	
	$("#submit").attr( 'disabled', 'disabled' );
	$("#submit").css( 'opacity', 0.0 );
	$("#submit").css( 'cursor', 'default' );
			
	$.post( "compose.php", { text: content } )
		.done( function( data ) {
			alert( data );
			if( data == 'error' ) {
				alert( 'couldn\'t post topic.' );
			} else if( data == 'expired' ) {
				loadPage( 'error.php?expired' );
			} else if( data == 'empty' ) {
				loadPage( 'error.php?emptycomposition' );
			} else if( data == 'toolong' ) {
				loadPage( 'error.php?toolong' );
			} else {
				refreshContent(); 
			}
		})
		.fail( function() {
			alert( 'couldn\'t post topic.' );
		});
}

//-----------------------------------------------------------------------------
function compositionKeyPressed() {
	
	adjustTop();
	if( !compose_sending ) {
		if( $("#composition").text().trim() != "" ) {
			$("#submit").css( 'opacity', 1.0 );
			$("#submit").css( 'cursor', 'pointer' );
		} else {
			
			$("#submit").attr( 'disabled', 'disabled' );
			$("#submit").css( 'opacity', 0.0 );
			$("#submit").css( 'cursor', 'default' );
		}
	}
}
  

//-----------------------------------------------------------------------------
function adjustTop() {
	var poop = $('#topic');
	var height = poop.height() 
		+ parseInt(poop.css('padding-top'))
		+ parseInt(poop.css('padding-bottom'))
		;
	var sh = $( window ).height();
	
	$("#goodbutton").css( "top", (height / 2 - 16) + "px" );
	$("#badbutton").css( "top", (height / 2 - 16) + "px" );
	height += 16; // body margin
	$margin = ((sh/2)-(height/2));
	if( $margin < 32 ) {
		$margin = 32;
	}
	poop.css( 'margin-top', $margin + "px" );
}

//-----------------------------------------------------------------------------
function adjustBottom() {
	if( $('#replies').length != 0 ) {
	 
		var sh = $( window ).height(); 
		$('#padding').css( 'height', ((sh/2)) + "px" );
	}
}


//-----------------------------------------------------------------------------
$(window).bind("mousewheel",function(ev, delta) {
	var scrollTop = $(window).scrollTop()-Math.round(delta)*51;
	$(window).scrollTop(scrollTop-Math.round(delta)*51); 
}); 

//-----------------------------------------------------------------------------
function adjustSize() {
	adjustTop();
	adjustBottom();
	
	contentwidth = $(window).width() - 72 - 16; // - padding - body width
	
	if( contentwidth > 574 ) contentwidth = 574;
	if( contentwidth < 32 ) contentwidth = 32;
	
	$( '.replies .reply' ).css( 'max-width', contentwidth + 'px' );
}

//-----------------------------------------------------------------------------
$(window).resize( function () { 
	adjustSize();
});

//-----------------------------------------------------------------------------
//$(window).load( function() {
	//adjustSize(); 
//	setTimeout( function() {$('#content').css( 'opacity', 1);}, 100 );
//});

//-----------------------------------------------------------------------------
$( window ).on ( 'beforeunload', function(){ 
   $('#content').css( 'opacity', 0 );
});

//-----------------------------------------------------------------------------
function pageLoadFailedContent() {
	return '<div class="topic nothing" id="topic">'+
			   'the page failed to load.'+
		   '</div>';
}

//-----------------------------------------------------------------------------
function fadeIn( content ) {	
	output = $('#content');
	$('#content').html( content );
	adjustSize();
	output.css( 'opacity', 1 ); // fade in
	setTimeout(
		function() {
			loading = false;
		}, FADE_IN_TIME );
}

//-----------------------------------------------------------------------------
function loadPage( url, delay ) {
	if( typeof delay === 'undefined' ) delay = 500;
	if( delay < 0 ) delay = -delay - FADE_OUT_TIME;
	// delay is used to control the Extra Dramatic Break Effect
	// negated values are treated as negated absolute values
	// positive delay = delay+CONST
	// negative delay = -delay
	
	loading = true;
	output = $('#content');
	output.css( 'opacity', 0 ); // fade out
	
	loading_fading_out = true;
	
	// whichever one of these finishes first (fadeout/ajax)
	// thats the one that sets the content and fades in
	setTimeout( 
		function() {
			loading_fading_out = false; 
			if( loading_page_content != null ) {
				fadeIn( loading_page_content );
				loading_page_content = null;
			} else {
				// we finished first, prime the output.
				output.html("");
			}
		}, FADE_OUT_TIME+delay );
	
	$.get( url )
		.done( function(data) {
		
			if( loading_fading_out ) {
				loading_page_content = data;
			} else {
				fadeIn( data );
				
			}
		})
		.fail( function() {
			if( loading_fading_out ) {
				loading_page_content = pageLoadFailedContent();
			} else {
				fadeIn( pageLoadFailedContent() );
			}
		});
	
}

//-----------------------------------------------------------------------------
function refreshContent() {
	loadPage( 'content.php' );
}

//-----------------------------------------------------------------------------
function tookTooLong() {
}

//-----------------------------------------------------------------------------
$( function() { 
	loadPage('content.php',-200);
});

//-----------------------------------------------------------------------------
$(document).bind('keydown', function(e) {
	if( loading ) return false;
    if( e.which === 116 ) {
		loadPage('content.php',500);
		return false;
    }
    if( e.which === 82 && e.ctrlKey ) {
		loadPage('content.php');
		return false;
    }
});