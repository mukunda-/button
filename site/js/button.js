
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
  
//var g_page_serial = 0; // used to catch outdated operations.

//-----------------------------------------------------------------------------
var images = new Array();
(function() {
	// preload images
	for (i = 0; i < preload.arguments.length; i++) {
		images[i] = new Image();
		images[i].src = preload.arguments[i];
	}
})();

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
	if( g_compose_sending ) return false;
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
	if( g_loading ) return false;
	if( g_compose_sending ) return false;
	if(  $('#replyinput').text().trim() == "" ) {
		return false;
	} 
	var content = ReadText( $('#replyinput') );  
	
	g_compose_sending = true;
	$("#replyinput").attr( 'contentEditable', false );  
	HideSubmit();
		
	m_timeouts.AddAjax( 
		$.post( "reply.php", 
			{ text: content, page: g_page } ))
						   
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
matbox.ResetReplyInput = function() {

	var rpi = $( '#replyinputbox' );
	if( !rpi.hasClass( 'fade' ) ) {
		rpi.css( "opacity", 1 );
	} else {
		if( GetTime() > matbox.GetLastReplyTime() + 10000 ) {
		
			matbox.ShowComposeI
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
		+ parseInt(poop.css('padding-bottom'));
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
	LiveRefresh.Reset();
	m_compose_sending = false; 
	matbox.ResetTopicVoted();
	m_timeouts.ClearAll();
}

//-----------------------------------------------------------------------------
function InitializePostLoad() {
	
	// replace image tags in topic
	if( g_topic_state == 'live' || g_topic_state == 'old' ) {
		// do live refresh?
	}
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
	//LoadPage( 'about.php' );
	LoadPage('content.php',-200);
});

//-----------------------------------------------------------------------------
$(document).bind('mousedown', function(e) {
	if( g_loading_fading_out ) return false;
});
 
//-----------------------------------------------------------------------------
$(document).bind('keydown', function(e) {
	if( g_loading_fading_out ) return false;
	 
    if( e.which === 116 ) {
		if( g_loading ) return false;
		LoadPage( 'content.php', 500 );
		return false;
    }
    if( e.which === 82 && e.ctrlKey ) {
		if( g_loading ) return false;
		LoadPage('content.php');
		return false;
    } /*
	
	if( e.which === 32 ) { // DEBUG
		refreshComments();
	}*/
});


// ****************************************************************************
// exposure
// ****************************************************************************


//matbox.SetSerial = function( serial ) {
//	g_account_serial = serial;
//} 

matbox.SetTopic = function( page, state ) {
	g_topic_page = page;
	g_topic_state = state;
}

matbox.GetPage = function() {
	return g_topic_page;
}

matbox.GetPageState = function() {
	return g_topic_state;
}

window.matbox.RefreshFromNothing = function () { 
	matbox.Loader.RefreshContent();
}

matbox.CompositionKeyPressed = CompositionKeyPressed;
matbox.ReplyKeyPressed       = ReplyKeyPressed;
matbox.DoLiveRefresh         = LiveRefresh.Refresh;
matbox.SubmitComposition     = SubmitComposition;
matbox.SubmitComment         = SubmitComment;
matbox.CloseOld				 = CloseOld;

matbox.InitializePreLoad     = InitializePreLoad;
matbox.InitializePostLoad    = InitializePostLoad;

})();

