// ==== matbox ====
// Copyright 2014 Mukunda Johnson

function isSet( a ) {
	return (typeof a) !== 'undefined';
}

(function() { window.matbox = window.matbox || {};
 
console.log('hi');

////var g_account_serial = 0; // the serial is used to
// ignore actions when the user is actually on
// a different page (most likely because they
// opened the site in another tab)
// --deprecated, just use PAGE.

var m_compose_sending = false; // if we are busy trying to submit a 
								// topic or reply
								
var m_page = 0; // what page we are on, old or not
var m_page_state = "none";	// state of the page we are viewing
 
var m_replytime = 0;		// last comment reply time, for helping determine
							// if we should show the reply box again
							// on the next auto refresh

var m_timeouts = AsyncGroup.Create(); // async operations that should be
									  // cancelled when a new page loads
  
var m_browsing_archive = false; // this is set to true if the user enters
                                // the archive
								// this is NOT set to true if the user
								// is coming from the outside with an
								// archive link, ONLY set when the user
								// actually presses the archive button
								// and this is unset when the user presses
								// the "new" button
								
//var g_page_serial = 0; // used to catch outdated operations.

//-----------------------------------------------------------------------------
var images = new Array();
function preload() {
	// preload images
	for (i = 0; i < preload.arguments.length; i++) {
		images[i] = new Image();
		images[i].src = preload.arguments[i];
	}
}

preload( 
	"bad.png", 
	"star.png"
);

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
	if( matbox.Loader.IsLoading() ) return false;
	if( m_compose_sending ) return false;
	if(  $('#composition').text().trim() == "" ) {
		return false;
	}
	
	var content = ReadText( $('#composition') );
	
	m_compose_sending = true;
	$("#composition").attr('contentEditable', false);
	//$("#composition").removeClass('composing');
	HideSubmit(); 
	
	m_timeouts.AddAjax( 
		$.post( "compose.php", 
			{ text: content, page: m_page } ))
			
		.done( function( data ) {
			
			if( data == 'error' ) {
				alert( 'couldn\'t post topic.' );
				m_compose_sending = false; 
				$( "#composition" ).attr( 'contentEditable', true ); 
				ShowSubmit( $("#composition") );
			} else if( data == 'expired' ) {
				matbox.Loader.Load( 'error.php?expired' );
			} else if( data == 'empty' ) {
				matbox.Loader.Load( 'error.php?emptycomposition' );
			} else if( data == 'toolong' ) {
				matbox.Loader.Load( 'error.php?toolong' );
			} else if( data == 'wrongpage' ) {
				matbox.Loader.Load( 'error.php?messedup' );
			} else {
				RefreshContent(); 
			}
		})
		.fail( function( handle ) {
			if( handle.ag_cancelled ) return;
			
			alert( 'couldn\'t post topic.' );
			
			m_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true ); 
			ShowSubmit( $("#composition") );
		});
}

//-----------------------------------------------------------------------------
function SubmitComment() {
	if( matbox.Loader.IsLoading() ) return false;
	if( m_compose_sending ) return false;
	if(  $('#replyinput').text().trim() == "" ) {
		return false;
	} 
	var content = ReadText( $('#replyinput') );
	
	m_compose_sending = true;
	$("#replyinput").attr( 'contentEditable', false );  
	HideSubmit();
	
	function reopeninput() {
		m_compose_sending = false;
		$( "#replyinput" ).attr( 'contentEditable', true ); 
		ShowSubmit( $( "#replyinput" ) );
	}
		
	m_timeouts.AddAjax( 
		$.post( "reply.php", 
			{ text: content, page: m_page } ))
						   
		.done( function( data ) {
			var reopeninput = false;
			
			if( data == 'error' ) {
				alert( 'couldn\'t post comment.' );
				reopeninput();
			} else if( data == 'wrongpage' ) {
				alert( 'something messed up.' );
				RefreshContent();
			} else if( data == 'expired' ) { 
				alert( 'too late.' );
				RefreshContent(); 
			} else if( data == 'tooshort' ) {
				alert( 'too short.' );
				reopeninput();
			} else if( data == 'toolong' ) {
				alert( 'too long.' );
				reopeninput();
			} else if( data == 'pleasewait' ) {
				alert( 'please wait a while first.' );
				reopeninput();
				
			} else {
				
				m_replytime = GetTime();
				$( "#replyinputbox" ).addClass( 'fade' ); 
				$( "#replyinputbox" ).css( 'opacity', 0 ); 
				$( "#replyinputbox" ).css( 'cursor', 'default' ); 
				m_timeouts.Set( matbox.LiveRefresh.Refresh, 500 );
			}
			
		})
		.fail( function( handle ) {
			if( handle.ag_cancelled ) return;
			
			alert( 'couldn\'t post comment.' );
			
			reopeninput();
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
matbox.ResetReplyInput = function() {

	var rpi = $( '#replyinputbox' );
	if( !rpi.hasClass( 'fade' ) ) {
		rpi.css( "opacity", 1 );
	} else {
		if( GetTime() > m_replytime + 10000 ) {
		 
			rpi.removeClass( 'fade' ); 
			rpi.css( 'opacity', 1 ); 
			rpi.css( 'cursor', 'inherit' );
			m_compose_sending = false;
			$( "#replyinput" ).attr( 'contentEditable', true );  
			$( "#replyinput" ).html( '' ); 
			$( "#replyinput" ).addClass( 'init' ); 				
		}
	}
}

//-----------------------------------------------------------------------------
function CompositionKeyPressed() {
	
	matbox.AdjustTop();
	if( !m_compose_sending ) {
		ShowSubmit( $("#composition") ); 
	}
}

//-----------------------------------------------------------------------------
function ReplyKeyPressed() { 
	if( !m_compose_sending ) {
		ShowSubmit( $("#replyinput") ); 
	} 
}


//-----------------------------------------------------------------------------
function CloseOld() {
	if( matbox.Loader.IsLoading() ) return;
	if( m_topic_state != 'old' ) return;
	
	matbox.Loader.SetLoading();
	
	m_timeouts.AddAjax( $.post( "closeold.php", { page: m_page } ) )
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
function ScoreRankName( a ) {
	if( a < 60 ) return "cancer";
	if( a < 70 ) return "bad";
	if( a < 80 ) return "okay";
	if( a < 90 ) return "good";
	if( a < 99 ) return "great";
	return "LEGENDARY";
}

//-----------------------------------------------------------------------------
function InitializePreLoad() {
	matbox.LiveRefresh.Reset();
	m_compose_sending = false; 
	matbox.ResetTopicVoted();
	m_timeouts.ClearAll();
}

//-----------------------------------------------------------------------------
function InitializePostLoad() {
	
	// replace image tags in topic
	if( m_page_state == 'live' || m_page_state == 'old' ) {
		// do live refresh?
		
		
		if( m_page_state == 'live' ) {
			// hook reply input
			$('#replyinput').focus( function() {
				if( $(this).hasClass( 'init' ) ) {
					$(this).removeClass( 'init' );
					$(this).html("");
				}
			});
			
			$("#replyinput").keydown( function() {
				if( matbox.Loader.IsLoading() ) return false;
				setTimeout( matbox.ReplyKeyPressed, 0 );
			});
		}
		
		matbox.LiveRefresh.Refresh();
	}
	
	matbox.Navbar.Show( [
			{ caption: 'test', onclick: 'testes()' }
		] );
}
 
/******************************************************************************
 * Global events
 *****************************************************************************/
 
//-----------------------------------------------------------------------------
$(window).bind("mousewheel",function(ev, delta) {
	// make the mousewheel scroll the page 
	// (doesn't work normally when scrollbar is hidden.)
	var scrollTop = $(window).scrollTop()-Math.round(delta)*51;
	$(window).scrollTop(scrollTop-Math.round(delta)*51); 
}); 

//-----------------------------------------------------------------------------
$(window).resize( function () { 
	// adjust the margins when the window is resized
	matbox.AdjustSize();
});

//-----------------------------------------------------------------------------
$( window ).on ( 'beforeunload', function(){ 
	// make the page fade out if the user presses refresh
	// it might not fade out all the way before the page reloads but this
	// is the best we can do.
	$('#content').css( 'opacity', 0 );
	matbox.Navbar.Hide();
}); 

//-----------------------------------------------------------------------------
$(document).bind('mousedown', function(e) {
	// cancel mouse events when the page is fading out
	if( matbox.Loader.IsLoading() ) return false;
});
 
//-----------------------------------------------------------------------------
$(document).bind('keydown', function(e) {
	// cancel keyboard events when the page is fading out
	if( matbox.Loader.IsLoading() ) return false;
	 
    if( (e.which === 116) || (e.which === 82 && e.ctrlKey) ) {
		// catch F5 and Ctrl+R reloads, make it do an internal reload.
		
		//if( g_loading ) return false; (already checked from the outside)
		
		matbox.Loader.RefreshContent();
		
		return false;
    }
    /*
	// debug: reload comments on space for stress testing
	if( e.which === 32 ) {
		refreshComments();
	}*/
});

//-----------------------------------------------------------------------------
$( function() { 
	// load the content when ready
	matbox.Loader.Load( 'content.php', -200 );
});

// ****************************************************************************
// exposure
// ****************************************************************************
 
matbox.SetPage = function( page, state ) {
	m_page = page;
	m_page_state = state;
}

matbox.GetPage = function() {
	return m_page;
}

matbox.GetPageState = function() {
	return m_page_state;
}

window.matbox.RefreshFromNothing = function () { 
	matbox.Loader.RefreshContent();
}

matbox.CompositionKeyPressed = CompositionKeyPressed;
matbox.ReplyKeyPressed       = ReplyKeyPressed;
matbox.SubmitComposition     = SubmitComposition;
matbox.SubmitComment         = SubmitComment;
matbox.CloseOld				 = CloseOld;

matbox.InitializePreLoad     = InitializePreLoad;
matbox.InitializePostLoad    = InitializePostLoad;

})();

