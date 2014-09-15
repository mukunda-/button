
(function() {

console.log('hi');

var FADE_OUT_TIME = 500; 
var FADE_IN_TIME = 500;

var g_loading = false;
var g_loading_fading_out = false;
var g_loading_page_content = null;
var g_compose_sending = false;
var g_page = 0;
var g_challenge = 0;

var g_last_comment = 0;
var g_num_comments = 0;
var g_topic_state = "old";
  
var g_page_serial = 0; // used to catch outdated operations.

//-----------------------------------------------------------------------------
// read element text with converted line breaks
function ReadText( element ) {
	// TODO fix trailing space bug
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
function SubmitComposition() {
	if( g_loading ) return false;
	if( g_compose_sending ) return false;
	if(  $('#composition').text().trim() == "" ) {
		return false;
	}
	
	var content = ReadText( $('#composition') );  
	
	g_compose_sending = true;
	$("#composition").attr('contentEditable', false);
	//$("#composition").removeClass('composing');
	HideSubmit(); 
			
	$.post( "compose.php", { text: content, page: g_page, challenge: g_challenge } )
		.done( function( data ) {
			alert(data);
			if( data == 'error' ) {
				alert( 'couldn\'t post topic.' );
				g_compose_sending = false; 
				$( "#composition" ).attr( 'contentEditable', true ); 
				ShowSubmit( $("#composition") );
			} else if( data == 'expired' ) {
				LoadPage( 'error.php?expired' );
			} else if( data == 'empty' ) {
				LoadPage( 'error.php?emptycomposition' );
			} else if( data == 'toolong' ) {
				LoadPage( 'error.php?toolong' );
			} else {
				RefreshContent(); 
			}
		})
		.fail( function() {
			alert( 'couldn\'t post topic.' );
			 
			g_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true ); 
			ShowSubmit( $("#composition") );
		});
}

//-----------------------------------------------------------------------------
function SubmitComment() {
	if( g_loading ) return false;
	if( g_compose_sending ) return false;
	if(  $('#replyinput').text().trim() == "" ) {
		return false;
	} 
	var content = ReadText( $('#replyinput') );  
	
	g_compose_sending = true;
	$("#replyinput").attr( 'contentEditable', false );  
	HideSubmit();
			
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
				RefreshContent(); 
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
				setTimeout( LiveRefresh.Refresh, 500 );
			}
			
			if( reopeninput ) {
				g_compose_sending = false;
				$( "#replyinput" ).attr( 'contentEditable', true ); 
				ShowSubmit( $( "#replyinput" ) );
			}
		})
		.fail( function() {
			alert( 'couldn\'t post comment.' );
			
			g_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true ); 
			ShowSubmit( $( "#replyinput" ) );
		});
}

//-----------------------------------------------------------------------------
function HideSubmit() {
	
	var submit = $("#submit");
	submit.attr( 'disabled', 'disabled' );
	submit.css( 'opacity', 0.0 );
	submit.css( 'cursor', 'default' );
}

//-----------------------------------------------------------------------------
function ShowSubmit( parent ) {
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
function CompositionKeyPressed() {
	
	AdjustTop();
	if( !g_compose_sending ) {
		ShowSubmit( $("#composition") ); 
	}
}

//-----------------------------------------------------------------------------
function ReplyKeyPressed() {

	if( !g_compose_sending ) {
		ShowSubmit( $("#replyinput") ); 
	}
	 
}

//-----------------------------------------------------------------------------
function AdjustTop() {
	var poop = $('#topic');
	var height = poop.height() 
		+ parseInt(poop.css('padding-top'))
		+ parseInt(poop.css('padding-bottom'))
		;
	var sh = $( window ).height();
	
	$("#goodbutton").css( "top", (height / 2 - 16) + "px" );
	$("#badbutton").css( "top", (height / 2 - 16) + "px" );
	height += 16; // body margin
	var margin = ((sh/2)-(height/2));
	if( margin < 32 ) {
		margin = 32;
	}
	poop.css( 'margin-top', margin + "px" );
}

//-----------------------------------------------------------------------------
function AdjustBottom() {
	if( $('#replies').length != 0 ) {
	
		var sh = $( window ).height();
		$('#padding').css( 'height', ((sh/2)) + "px" );
	}
}


//-----------------------------------------------------------------------------
function AdjustSize() {
	AdjustTop();
	AdjustBottom();
	
	var content_width = $(window).width() - 72 - 16; // - padding - body width
	
	if( content_width > 574 ) content_width = 574;
	if( content_width < 32 ) content_width = 32;
	
	$( '.replies .reply' ).css( 'max-width', content_width + 'px' );
}
 
//-----------------------------------------------------------------------------
function PageLoadFailedContent() {
	return '<div class="topic nothing" id="topic">'+
			   'the page failed to load.'+
		   '</div>';
}

//-----------------------------------------------------------------------------
function FadeIn( content ) {	

	g_page_serial++;
	output = $('#content');
	$('#content').html( content );
	
	// global initialization here:
	g_compose_sending = false;
	g_last_comment = 0;
	g_num_replies = 0;
	
	
	AdjustSize();
	output.css( 'opacity', 1 ); // fade in
	setTimeout(
		function() {
			g_loading = false;
		}, FADE_IN_TIME );
		
}

//-----------------------------------------------------------------------------
function LoadPage( url, delay ) {
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
				FadeIn( g_loading_page_content );
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
				FadeIn( data );
				
			}
		})
		.fail( function() {
			if( g_loading_fading_out ) {
				g_loading_page_content = pageLoadFailedContent();
			} else {
				FadeIn( pageLoadFailedContent() );
			}
		});
	
}

//-----------------------------------------------------------------------------
function RefreshContent() {
	LoadPage( 'content.php' );
}

//-----------------------------------------------------------------------------
var LiveRefresh = new function() { 
	var m_this = this;
	var m_queue = [];
	var m_refreshing = false;
	var m_serial;
	var m_autorefresh_handle = null;
	
	function DequeueNext() {
		m_refreshing = true;
		if( m_queue.length == 0 ) {
			m_refreshing = false;
			return;
		}
		m_serial = m_queue.shift();
		DoRefresh();
	}
	
	function CancelAutoRefresh() {
		if( m_autorefresh_handle != null ) {
			clearTimeout( m_autorefresh_handle );
			m_autorefresh_handle = null;
		}
	}
	
	function SetAutoRefresh() {
		CancelAutoRefresh();
		m_autorefresh_handle = setTimeout( m_this.Refresh, 35*1000 );
	}
	
	function ShowCommentReply() {
		// last function in queue string.
		var rpi = $( '#replyinputbox' );
		if( !rpi.hasClass( 'fade' ) ) {
			setTimeout( function() {
				if( CheckSerial() ) return; 
				if( !rpi.hasClass( 'fade' ) ) {
					rpi.css( "opacity", 1 );
				}
			}, 500 );
		}
		DequeueNext();
	}
		
	function ChainFadeComments( start, end ) {
		if( end < start ) {
			ShowCommentReply();
			return;
		}
		
		var id = start;
		var func = function() {
			if( CheckSerial() ) return; 
			
			$( '#comment' + id ).css( "opacity", 1 );
			id++;
			if( id <= end ) {
				setTimeout( func, 100 );
			} else {
				ShowCommentReply();
				
			}
		}
		setTimeout( func, 50 );
	}
	
	function OnAjaxDone( data ) {
		if( CheckSerial() ) return; 
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
					html += '<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="VoteCommentGood('+entry.id+')">';
					if( entry.vote === true ) {
						html += '<img src="star.png" alt="good"></div>';
					} else {
						html += '<img src="unstar.png" alt="good"></div>';
					}
					
					selected = entry.vote === false ? " selected": "";
					html += '<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="VoteCommentBad('+entry.id+')">';
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
			ChainFadeComments( startcomment, g_num_comments-1 );
		} else {
		
			DequeueNext();
		}
	}
	
	function DoRefresh() {
		if( CheckSerial() ) return; 
		
		SetAutoRefresh();
	
		$.get( "liverefresh.php", 
			{page: g_page, 
			challenge: g_challenge, 
			last: g_last_comment} ) 
		.done( OnAjaxDone )
		.fail( function() {
			// try again later
			DequeueNext();
		});
	}
	
	function CheckSerial() {
		if( m_serial != g_page_serial ) {
			DequeueNext();
			return true;
		}
		return false;
	}
	
	this.Refresh = function() {
		
		m_queue.push( g_page_serial );
		if( !m_refreshing ) {
			DequeueNext();
		}
	}
	 
}

function VoteTopicGood() {
	
}

function VoteTopicBad() {
	
}

function VoteComment( id, upvote ) {
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
	
	$.post( 'commentvote.php', 
		{ page: g_page, 
		  challenge: g_challenge, 
		  comment: id, 
		  vote: upvote ? 'good':'cancer' } ) ; 
	// ignore result
	// not really a problem if a few of these votes get missed.
	
	
}

//-----------------------------------------------------------------------------
function VoteCommentGood(id) {
	VoteComment( id, true );
}

//-----------------------------------------------------------------------------
function VoteCommentBad(id) {
	VoteComment( id, false );
}

//-----------------------------------------------------------------------------
$(window).bind("mousewheel",function(ev, delta) {
	var scrollTop = $(window).scrollTop()-Math.round(delta)*51;
	$(window).scrollTop(scrollTop-Math.round(delta)*51); 
}); 

//-----------------------------------------------------------------------------
$(window).resize( function () { 
	AdjustSize();
});

//-----------------------------------------------------------------------------
$( window ).on ( 'beforeunload', function(){ 
   $('#content').css( 'opacity', 0 );
});

//-----------------------------------------------------------------------------
$( function() { 
	LoadPage('content.php',-200);
});

//-----------------------------------------------------------------------------
$(document).bind('mousedown', function(e) {
	if( g_loading_fading_out ) return false;
});
 
//-----------------------------------------------------------------------------
$(document).bind('keydown', function(e) {
	if( g_loading_fading_out ) return false;
	
/* DEBUG BYPASS
    if( e.which === 116 ) {
		if( g_loading ) return false;
		LoadPage( 'content.php', 500 );
		return false;
    }
    if( e.which === 82 && e.ctrlKey ) {
		if( g_loading ) return false;
		LoadPage('content.php');
		return false;
    }*/
	if( e.which === 32 ) { // DEBUG
		refreshComments();
	}
});

// ****************************************************************************
// exposure
// ****************************************************************************

window.Button = window.Button || {};

window.Button.SetPage = function( page, challenge ) {
	g_page = page;
	g_challenge = challenge;
}

window.Button.SetTopicState = function( state ) {
	g_topic_state = state;
}

window.Button.IsLoading = function() {
	return g_loading;
}

window.Button.CompositionKeyPressed = CompositionKeyPressed;
window.Button.ReplyKeyPressed       = ReplyKeyPressed;
window.Button.DoLiveRefresh         = LiveRefresh.Refresh;
window.Button.SubmitComposition     = SubmitComposition;
window.Button.SubmitComment         = SubmitComment;

})()

