(function() { window.matbox = window.matbox || {};

matbox.Loader = this;

var m_loading = false;
var m_loading_fading_out = false;
var m_loading_page_content = null;

var PAGE_LOAD_FAILED_CONTENT = 
	'<div class="topic nothing" id="topic">'+
		'something messed up.'+
	'</div><!-- (the page failed to load.) -->';
	


//-----------------------------------------------------------------------------
function FadeIn( content ) {	
	// global initialization here:
	
	matbox.InitializeNewPage();
	g_last_comment = 0;
	g_compose_sending = false;
	g_num_replies = 0;
	g_topic_voted = false;
 
	output = $('#content');
	$('#content').html( content );
	
	// replace image tags in topic
	if( g_topic_state == 'live' || g_topic_state == 'old' ) {
		
	}
	
	AdjustSize();
	output.css( 'opacity', 1 ); // fade in
	setTimeout(
		function() {
			g_loading = false;
		}, FADE_IN_TIME );
		
}

/** ---------------------------------------------------------------------------
 * Load a content page.
 *
 * @param url URL of page to load.
 * @param delay Used to control the Extra Dramatic Break Effect.
 *              negated values are treated as negated absolute values
 *              positive values are added to the normal fade constant
 */
this.Load = function( url, delay ) {
	if( typeof delay === 'undefined' ) delay = 500;
	if( delay < 0 ) delay = -delay - FADE_OUT_TIME; 
	
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
				g_loading_page_content = PAGE_LOAD_FAILED_CONTENT;
			} else {
				FadeIn( PAGE_LOAD_FAILED_CONTENT );
			}
		});
	
}

/** ---------------------------------------------------------------------------
 * Reload content.php
 */
this.RefreshContent = function() {
	LoadPage( 'content.php' );
}

})();
