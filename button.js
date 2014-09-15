
var g_loading = false;
var g_loading_fading_out = false;
var g_loading_page_content = null;
var g_compose_sending = false;
var g_page = 0;
var g_challenge = 0;

var g_last_comment = 0;
var g_num_comments = 0;
var g_topic_state = "old";

var g_last_comment_refresh = 0;
var g_refreshing_comments = false;
var g_autorefresh_comments_handle = null;

var FADE_OUT_TIME = 500; 
var FADE_IN_TIME = 500;

var refreshCommentsQueue = $({});
var g_refresh_comments_ajax = null;

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
	if( g_loading ) return false;
	if( g_compose_sending ) return false;
	if(  $('#composition').text().trim() == "" ) {
		return false;
	}
	
	var content = readText( $('#composition') );  
	
	g_compose_sending = true;
	$("#composition").attr('contentEditable', false);
	//$("#composition").removeClass('composing');
	hideSubmit(); 
			
	$.post( "compose.php", { text: content, page: g_page, challenge: g_challenge } )
		.done( function( data ) {
			alert(data);
			if( data == 'error' ) {
				alert( 'couldn\'t post topic.' );
				g_compose_sending = false; 
				$( "#composition" ).attr( 'contentEditable', true ); 
				showSubmit( $("#composition") );
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
			 
			g_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true ); 
			showSubmit( $("#composition") );
		});
}

function submitComment() {
	if( g_loading ) return false;
	if( g_compose_sending ) return false;
	if(  $('#replyinput').text().trim() == "" ) {
		return false;
	} 
	var content = readText( $('#replyinput') );  
	
	g_compose_sending = true;
	$("#replyinput").attr( 'contentEditable', false );  
	hideSubmit();
			
	$.post( "reply.php", { text: content, 
	                       page: g_page, 
						   challenge: g_challenge  } )
						   
		.done( function( data ) {
			var reopeninput = false;
			alert( data );
			if( data == 'error' ) {
				reopeninput = true;
				alert( 'couldn\'t post comment.' );
				
			} else if( data == 'expired' ) {
				
				alert( 'too late.' );
				refreshContent(); 
			} else if( data == 'tooshort' ) {
				reopeninput = true;
				alert( 'too short.' );
			} else if( data == 'toolong' ) {
				reopeninput = true;
				alert( 'too long.' );
			} else if( data == 'pleasewait' ) {
				reopeninput = true;
				alert( 'please wait a while first.' );
				
			} else {
				
				$( "#replyinputbox" ).addClass( 'fade' ); 
				$( "#replyinputbox" ).css( 'opacity', 0 ); 
				setTimeout( refreshComments, 500 );
			}
			
			if( reopeninput ) {
				g_compose_sending = false;
				$( "#replyinput" ).attr( 'contentEditable', true ); 
				showSubmit( $( "#replyinput" ) );
			}
		})
		.fail( function() {
			alert( 'couldn\'t post comment.' );
			
			g_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true ); 
			showSubmit( $( "#replyinput" ) );
		});
}

//-----------------------------------------------------------------------------
function hideSubmit() {
	
	var submit = $("#submit");
	submit.attr( 'disabled', 'disabled' );
	submit.css( 'opacity', 0.0 );
	submit.css( 'cursor', 'default' );
}

function showSubmit( parent ) {
	var submit = $("#submit");
	if( parent.text().trim() != "" ) {
		submit.css( 'opacity', 1.0 );
		submit.css( 'cursor', 'pointer' );
	} else {
		
		submit.attr( 'disabled', 'disabled' );
		submit.css( 'opacity', 0.0 );
		submit.css( 'cursor', 'default' );
	}
}

//-----------------------------------------------------------------------------
function compositionKeyPressed() {
	
	adjustTop();
	if( !g_compose_sending ) {
		showSubmit( $("#composition") ); 
	}
}

function replyKeyPressed() {

	if( !g_compose_sending ) {
		showSubmit( $("#replyinput") ); 
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
			g_loading = false;
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
	
	g_loading = true;
	output = $('#content');
	output.css( 'opacity', 0 ); // fade out
	
	g_loading_fading_out = true;
	
	// whichever one of these finishes first (fadeout/ajax)
	// thats the one that sets the content and fades in
	setTimeout( 
		function() {
			g_loading_fading_out = false; 
			if( g_loading_page_content != null ) {
				fadeIn( g_loading_page_content );
				g_loading_page_content = null;
			} else {
				// we finished first, prime the output.
				output.html("");
			}
		}, FADE_OUT_TIME+delay );
	
	$.get( url )
		.done( function(data) {
		
			if( g_loading_fading_out ) {
				g_loading_page_content = data;
			} else {
				fadeIn( data );
				
			}
		})
		.fail( function() {
			if( g_loading_fading_out ) {
				g_loading_page_content = pageLoadFailedContent();
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
/* DEBUG BYPASS
	if( g_loading ) return false;
    if( e.which === 116 ) {
		loadPage( 'content.php', 500 );
		return false;
    }
    if( e.which === 82 && e.ctrlKey ) {
		loadPage('content.php');
		return false;
    }*/
	 if( e.which === 32 ) {
		refreshComments();
		}
});
//-----------------------------------------------------------------------------
$(document).bind('mousedown', function(e) {

	if( g_loading_fading_out ) return false;
});

function interruptRefreshComments() {
	
}

//-----------------------------------------------------------------------------
function refreshComments() {
 
	function DequeueNext() {
		if( refreshCommentsQueue.queue( "rc" ).length == 0 ) {
			g_refreshing_comments = false;
			return;
		}
		
		refreshCommentsQueue.dequeue( "rc" );
	}
	
	function showCommentReply() {
		// last function in queue string.
		var rpi = $( '#replyinputbox' );
		if( !rpi.hasClass( 'fade' ) ) {
			setTimeout( function() {
				if( !rpi.hasClass( 'fade' ) ) {
					rpi.css( "opacity", 1 );
				}
			}, 500 );
		}
		DequeueNext();
	}
	
	function cancelAutoRefreshComments() {
		if( g_autorefresh_comments_handle != null ) {
			clearTimeout(g_autorefresh_comments_handle);
			g_autorefresh_comments_handle = null;
		}
	}

	function setAutoRefreshComments() { 
		cancelAutoRefreshComments();
		g_autorefresh_comments_handle = setTimeout( refreshComments, 35*1000 );
	}
	
	
	function chainFadeComments( start, end ) {
		if( end < start ) {
			showCommentReply();
			return;
		}
		
		var id = start;
		var func = function() {
			
			$( '#comment' + id ).css( "opacity", 1 );
			id++;
			if( id <= end ) {
				setTimeout( func, 100 );
			} else {
				showCommentReply();
				
			}
		}
		setTimeout( func, 50 );
	}

	function startRefresh() {
	
		setAutoRefreshComments();
	
		$.get( "getcomments.php", 
			{page: g_page, 
			challenge: g_challenge, 
			last: g_last_comment} ) 
			
		.done( function( data ) {

			if( data != 'error' ) {
				data = JSON.parse( data );
				
				var startcomment = g_num_comments;
				
				for( var i = 0; i < data.length; i++ ) {
					
					var entry = data[i];
					
					if( entry.id > g_last_comment ) {
						g_last_comment = entry.id;
					}
					
					if( g_topic_state == "live" ) {
						var html = '<div class="reply" id="comment'+g_num_comments+'">' + entry.content;
						var selected = entry.vote === true ? " selected": "";
						html += '<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="voteCommentGood('+entry.id+')">';
						if( entry.vote === true ) {
							html += '<img src="star.png" alt="good"></div>';
						} else {
							html += '<img src="unstar.png" alt="good"></div>';
						}
						
						selected = entry.vote === false ? " selected": "";
						html += '<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="voteCommentBad('+entry.id+')">';
						if( entry.vote === false ) {
							html += '<img src="bad.png" alt="bad"></div>';
						} else {
							html += '<img src="notbad.png" alt="bad"></div>';
							
						}
						html += '</div> ';
						
						
					} else {
						var html = '<div class="reply" id="comment'+g_num_comments+'">' + entry.content + '</div>&nbsp;';
						
					}
					g_num_comments++;
					
					$( '#replylist' ).append( html );
					
				}
				chainFadeComments( startcomment, g_num_comments-1 );
			} else {
			
				DequeueNext();
			}
		})
		.fail( function( data ) {
			// try again later
			DequeueNext();
		});
	}
	refreshCommentsQueue.queue( "rc", startRefresh );
	if( !g_refreshing_comments ) {
		g_refreshing_comments = true;
		refreshCommentsQueue.dequeue( "rc" );
	}	
	
	// TODO refreshing page while refreshing comments.
}


function voteTopicGood() {
	
}

function voteTopicBad() {
	
}

function voteComment( id, upvote ) {
	var vgood = $( '#votegood' + id );
	var vbad = $( '#votebad' + id );
	
	if( upvote ) {
		if( vgood.hasClass( 'selected' ) ) return; // already voted.
	} else {
		if( vbad.hasClass( 'selected' ) ) return; // already voted.
	}
	
	if( upvote ) {
		vgood.addClass( 'selected' );
		vbad.removeClass( 'selected' );
		vgood.html( '<img src="star.png">' );
		vbad.html( '<img src="notbad.png">' );
	} else {
		vgood.removeClass( 'selected' );
		vbad.addClass( 'selected' );
		vgood.html( '<img src="unstar.png">' );
		vbad.html( '<img src="bad.png">' );
	}
			!
	$.post( 'commentvote.php', 
		{ page: g_page, 
		  challenge: g_challenge, 
		  comment: id, 
		  vote: upvote ? 'good':'cancer' } ) ; 
	// ignore result
	// not really a problem if a few of these votes get missed.
	
	
}

function voteCommentGood(id) {
	voteComment( id, true );
}

function voteCommentBad(id) {
	voteComment( id, false );
}
