
(function() {

console.log('hi');

var FADE_OUT_TIME = 500; 
var FADE_IN_TIME = 500;

var g_loading = false;
var g_loading_fading_out = false;
var g_loading_page_content = null;
var g_compose_sending = false;
var g_account_serial = 0; // the serial is used to
// ignore actions when the user is actually on
// a different page (most likely because they
// opened the site in another tab)

var g_last_comment = 0;
var g_num_comments = 0;
var g_topic_state = "old";

var g_topic_voted = false;

var g_replytime = 0;
  
//var g_page_serial = 0; // used to catch outdated operations.

//-----------------------------------------------------------------------------
function GetTime() {
	return new Date().getTime();
}

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
			
	$.post( "compose.php", 
		{ text: content, serial: g_account_serial } )
		.done( function( data ) {
			
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
			} else if( data == 'wrongpage' ) {
				LoadPage( 'error.php?messedup' );
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
	                       serial: g_account_serial } )
						   
		.done( function( data ) {
			var reopeninput = false;
			
			if( data == 'error' ) {
				reopeninput = true;
				alert( 'couldn\'t post comment.' );
			} else if( data == 'badserial' ) {
				alert( 'something messed up.' );
				RefreshContent();
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
				
				g_replytime = GetTime();
				$( "#replyinputbox" ).addClass( 'fade' ); 
				$( "#replyinputbox" ).css( 'opacity', 0 ); 
				$( "#replyinputbox" ).css( 'cursor', 'default' ); 
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
		HideSubmit();
		
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
	
	$("#scorediv").css( "top", (height / 2 - 16) + "px" );
	$("#newbutton").css( "top", (height / 2 - 16) + "px" );
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
			   'something messed up.'+
		   '</div><!-- (the page failed to load.) -->';
}

//-----------------------------------------------------------------------------
function FadeIn( content ) {	
 
	output = $('#content');
	$('#content').html( content );
	
	// global initialization here:
	g_compose_sending = false;
	g_last_comment = 0;
	g_num_replies = 0;
	g_topic_voted = false;
	
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
	
	LiveRefresh.CancelAutoRefresh();
	
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
function CloseOld() {
	if( g_loading ) return;
	if( g_topic_state != 'old' ) return;
	
	g_loading = true;
	$.post( "closeold.php", {serial:g_account_serial} )
		.always( function() {
			RefreshContent();
		});
}

//-----------------------------------------------------------------------------
function ScoreRank( a ) {
	if( a < 60 ) return "rank_cancer";
	if( a < 70 ) return "rank_poop";
	if( a < 80 ) return "rank_ok";
	if( a < 90 ) return "rank_good";
	if( a < 99 ) return "rank_great";
	return "rank_god";
	
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
		m_autorefresh_handle = setTimeout( m_this.Refresh, 33*1000 ); 
	}
	
	function ShowCommentReply() {
		// last function in queue string.
		var rpi = $( '#replyinputbox' );
		setTimeout( function() {
			if( CheckSerial() ) return; 
			if( !rpi.hasClass( 'fade' ) ) {
				rpi.css( "opacity", 1 );
			} else {
				if( GetTime() > g_replytime + 2000 ) {
				
					rpi.removeClass( 'fade' ); 
					rpi.css( 'opacity', 1 ); 
					rpi.css( 'cursor', 'inherit' );
					g_compose_sending = false;
					$( "#replyinput" ).attr( 'contentEditable', true ); 
					$( "#replyinput" ).html( 'discuss...', true ); 
					$( "#replyinput" ).addClass( 'init' );
					ShowSubmit( $( "#replyinput" ) );						
				}
			}
		}, 500 );
		DequeueNext();
		return;
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
		
		if( data == 'error' ) {
			DequeueNext();
			return;
		} else if( data == 'expired' || data == 'deleted' ) {
			m_queue = [];
			m_refreshing = false;
			RefreshContent();
		} else if( data == 'wrongpage' ) {
			m_queue = [];
			m_refreshing = false;
			RefreshContent();
		} else {
			data = JSON.parse( data );
			
			var startcomment = g_num_comments;
			
			for( var i = 0; i < data.length; i++ ) {
				
				var entry = data[i];
				
				if( entry.id > g_last_comment ) {
					g_last_comment = entry.id;
				}
				
				if( g_topic_state == "live" ) {
					var html = [];
					html.push( '<div class="reply" id="comment'+g_num_comments+'">' + entry.content );
					var selected = entry.vote === true ? " selected": "";
					html.push( '<div class="rvote rgood '+selected+'" id="votegood'+entry.id+'" onclick="Button.VoteCommentGood('+entry.id+')">' );
					if( entry.vote === true ) {
						html.push( '<img src="star.png" alt="good" title="good"></div>' );
					} else {
						html.push( '<img src="unstar.png" alt="good" title="good"></div>' );
					}
					
					selected = entry.vote === false ? " selected": "";
					html.push( '<div class="rvote rbad '+selected+'" id="votebad'+entry.id+'" onclick="Button.VoteCommentBad('+entry.id+')">' );
					if( entry.vote === false ) {
						html.push( '<img src="bad.png" alt="bad" title="bad"></div>' );
					} else {
						html.push( '<img src="notbad.png" alt="bad" title="bad"></div>' );
						
					}
					html.push( '</div> ' );
					
					
				} else {
					var html = [];
					html.push( '<div class="reply" id="comment'+g_num_comments+'">' + entry.content );
					html.push( '<div class="score '+ ScoreRank(entry.score) +'">' + entry.score + '</div>' );
					html.push( '</div>&nbsp;' );
				}
				g_num_comments++;
				
				$( '#replylist' ).append( html.join("") );
				
			}
			ChainFadeComments( startcomment, g_num_comments-1 );
		}
	}
	
	function DoRefresh() {
		if( CheckSerial() ) return; 
		
		if( g_topic_state == 'live' ) {
			SetAutoRefresh();
		} else if( g_topic_state != 'old' ) {
			DequeueNext(); // bad state
			return;
		}
		
		var post = {
			serial: g_account_serial,
			last: g_last_comment };
			
		if( g_topic_state == 'old' ) {
			post.old = 1;
		}
	
		$.get( "liverefresh.php", post ) 
		.done( OnAjaxDone )
		.fail( function() {
			// try again later
			DequeueNext();
			return;
		});
	}
	
	function CheckSerial() {
		if( m_serial != g_account_serial ) {
			DequeueNext();
			return true;
		}
		return false;
	}
	
	this.Refresh = function() {
		if( g_topic_state != 'live' &&
			g_topic_state != 'old' ) return;
		
		m_queue.push( g_account_serial );
		if( !m_refreshing ) {
			DequeueNext();
		}
	}
	 
	this.CancelAutoRefresh = CancelAutoRefresh;
}

function VoteTopic( upvote ) {
	if( g_topic_voted ) return;
	g_topic_voted = true;
	
	var vgood = $("#goodbutton");
	var vbad = $("#badbutton");
	
	if( upvote ) {
		vgood.html( '<img src="star.png" alt="good" title="good">' );
	} else {	
		vbad.html( '<img src="bad.png" alt="bad" title="bad">' );
	}
	vgood.removeClass( "clickable" );
	vbad.removeClass( "clickable" );
	
	$.post( 'topicvote.php', 
		{ serial: g_account_serial,  
		  vote: upvote ? 'good':'cancer' } )
		.done( function( data ) {
		  
			if( data == 'error' ) {
				RefreshContent(); 
			} else if( data == 'good' ) {
				// do nothing.
			} else if( data == 'cancer' ) {
				// will get new topic.
				RefreshContent(); 
			} else if( data == 'expired' ) {
				RefreshContent(); 
			}
		})
		.fail( function(  ) {
		
			g_topic_voted = false;
			vgood.html( '<img src="unstar.png" alt="good" title="good">' );
			vbad.html( '<img src="notbad.png" alt="bad" title="bad">' );
			
			vgood.addClass( "clickable" );
			vbad.addClass( "clickable" );
			
		});
}

function VoteTopicGood() {
	VoteTopic( true );
}

function VoteTopicBad() {
	VoteTopic( false );
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
		{ serial: g_account_serial,
		  comment: id, 
		  vote: upvote ? 'good':'cancer' } ).done(function(data){alert(data)}) ; 
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

window.Button.SetSerial = function( serial ) {
	g_account_serial = serial;
}
/*
window.Button.SetPage = function( page, challenge ) {
	g_page = page;
	g_challenge = challenge;
}*/

window.Button.SetTopicState = function( state ) {
	g_topic_state = state;
}

window.Button.IsLoading = function() {
	return g_loading;
}

window.Button.RefreshFromNothing	= function () {
	if( g_loading ) return;
	
	RefreshContent();
}

window.Button.CompositionKeyPressed = CompositionKeyPressed;
window.Button.ReplyKeyPressed       = ReplyKeyPressed;
window.Button.DoLiveRefresh         = LiveRefresh.Refresh;
window.Button.SubmitComposition     = SubmitComposition;
window.Button.SubmitComment         = SubmitComment;
window.Button.VoteCommentGood       = VoteCommentGood;
window.Button.VoteCommentBad        = VoteCommentBad;
window.Button.VoteTopicGood         = VoteTopicGood;
window.Button.VoteTopicBad          = VoteTopicBad;
window.Button.CloseOld				= CloseOld;


})()

