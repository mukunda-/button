(function() { window.matbox = window.matbox || {};

matbox.Loader = this;

var FADE_OUT_TIME = 500;
var FADE_IN_TIME = 500;

var m_loading = false;
var m_fading_out = false;
var m_page_content = null;

var PAGE_LOAD_FAILED_CONTENT = 
	'<div class="topic nothing" id="topic">'+
		'something messed up.'+
	'</div><!-- (the page failed to load.) -->';
	
//-----------------------------------------------------------------------------	
function FadeIn( content ) {	
	// global initialization here:
	LiveRefresh.Reset();
	matbox.InitializePreLoad();
	
	output = $('#content');
	$('#content').html( content );
	
	matbox.InitializePostLoad();
	
	
	AdjustSize();
	output.css( 'opacity', 1 ); // fade in
	setTimeout(
		function() {
			m_loading = false;
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
	if( m_loading ) return;

	if( !isSet(delay) ) delay = 500;
	if( delay < 0 ) delay = -delay - FADE_OUT_TIME; 
	
	m_loading = true;
	
	LiveRefresh.Reset();//CancelAutoRefresh();
	
	output = $( '#content' );
	output.css( 'opacity', 0 ); // fade out
	
	m_fading_out = true;
	
	// whichever one of these finishes first (fadeout/ajax)
	// thats the one that sets the content and fades in
	setTimeout( 
		function() {
			m_fading_out = false; 
			if( m_page_content != null ) {
				FadeIn( m_page_content );
				m_page_content = null;
			} else {
				// we finished first, prime the output.
				output.html("");
			}
		}, FADE_OUT_TIME+delay );
	
	$.get( url )
		.done( function(data) {
		
			if( g_loading_fading_out ) {
				m_page_content = data;
			} else {
				FadeIn( data );
				
			}
		})
		.fail( function() {
			if( g_loading_fading_out ) {
				m_page_content = PAGE_LOAD_FAILED_CONTENT;
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
