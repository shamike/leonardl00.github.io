/**
 * @author  : hahnzhu
 * @version : 0.2.2
 * @date    : 2014-09-28
 * @repository: https://github.com/hahnzhu/parallax.js
 */

if (typeof jQuery === 'undefined') { throw new Error('Parallax.js\'s script requires Zepto') }

!function($) {

//  'use strict';

    var startPos,           // Start touch point (X/Y coordinates)
        endPos,             // End touch point (X/Y coordinate)
        stage,              // Used to identify the stage of the onStart/onMove/onEnd process, and solve the repeated call of onEnd
        offset,             // Offset distance
        direction,			// Page turning direction

        curPage, 			// page current page
        pageCount,          // number of pages
        pageWidth,          // page width
        pageHeight,         // page height

        $pages,             // page external wrapper
        $pageArr,           // page list
        $animateDom,		// All animation elements that set [data-animate]

        options,            // Final configuration item

        touchDown = false,  // The finger is pressed (cancel the transition when the touch is moved)
        movePrevent = true; // Prevent sliding (finger pressing during the animation cannot be prevented)



    // Define instance methods (jQuery Object Methods)
    // ==============================

    $.fn.parallax = function(opts) {
        options = $.extend({}, $.fn.parallax.defaults, opts);

        return this.each(function() {
            $pages = $(this);
            $pageArr = $pages.find('.page');

            init();
        })
    }


    // Define configuration options
    // ==============================

    $.fn.parallax.defaults = {

        direction: 'vertical',  // Scroll direction, "horizontal/vertical"
        swipeAnim: 'default',   // Scroll animation, "default/cover"
        drag: true,             // Is there a drag effect
        loading: false,         // Need to load page
        indicator: false,       // Whether to have instructions for navigation
        arrow: false,           // Whether to have arrows
        onchange: function(){}, // Callback
        orientationchange: function(){}	// Screen flip

    };



    function init() {

    	// Prioritize loading images
    	if (options.loading) {
			$('.wrapper').append('<div class="parallax-loading"><i class="ui-loading ui-loading-white"></i></div>');
        } else {
        	// Allow touch swipe
            movePrevent = false;
        }

		curPage 	= 0;
		direction	= 'stay';
        pageCount   = $pageArr.length;           	// Get the number of pages
        pageWidth   = document.documentElement.clientWidth;     // Get the phone screen width
        pageHeight  = document.documentElement.clientHeight;    // Get the phone screen height
        $animateDom = $('[data-animation]');	 	// Get animation element node

        for (var i=0; i<pageCount; i++) {          // Add data-id in bulk
            $($pageArr[i]).attr('data-id', i+1);
        }

        $pages.addClass(options.direction)		// Add direction class
            	.addClass(options.swipeAnim);  	// Add swipeAnim class

        $pageArr.css({                    		// Initialize page width and height
            'width': pageWidth + 'px',
            'height': pageHeight + 'px'
        });

        options.direction === 'horizontal' ?     // Set wrapper width and height
            $pages.css('width', pageWidth * $pageArr.length) :
            $pages.css('height', pageHeight * $pageArr.length);


        if (options.swipeAnim === 'cover') {		// Reset the width and height of the page (because these two effects are completely different from the default implementation)
            $pages.css({
                'width': pageWidth,
                'height': pageHeight
            });
            $pageArr[0].style.display = 'block'; // Can not be defined by css, otherwise there will be bugs under Android and iOS
        }


		if (!options.loading) {
            $($pageArr[curPage]).addClass('current');
            options.onchange(curPage, $pageArr[curPage], direction);
            animShow();
        }

    }



    // Called when the finger is first pressed
    // Provided interface:
    // 1. Initial position startPos
    // ==============================

    function onStart(e) {

        if (movePrevent === true) {
            event.preventDefault();
            return false;
        }

        touchDown = true;	// Finger pressed

        options.direction === 'horizontal' ? startPos = e.pageX : startPos = e.pageY;

        if (options.swipeAnim === 'default') {
            $pages.addClass('drag');    // Prevent transition effects

            offset = $pages.css("-webkit-transform")
                        .replace("matrix(", "")
                        .replace(")", "")
                        .split(",");

            options.direction === 'horizontal' ?
                offset = parseInt(offset[4]) :
                offset = parseInt(offset[5]);
        }

        if ((options.swipeAnim === 'cover' && options.drag)) {
            $pageArr.addClass('drag');
        }

        stage = 1;
    }


    // Called during movement (finger did not release)
    // Provided interface:
    // 1. EndPos that changes in real time
    // 2. Add direction class forward/backward
    // ==============================

    function onMove(e) {

        if(movePrevent === true || touchDown === false){
            event.preventDefault();
            return false;
        }
        event.preventDefault();
        options.direction === 'horizontal' ? endPos = e.pageX : endPos = e.pageY;

        addDirecClass();    // Add direction class

        if (options.drag && !isHeadOrTail()) { // Called when dragging
            dragToMove();
        }
        stage = 2;
    }




    // Call after finger release
    // Provided interface:
    // 1. Get the last coordinate information endPos
    //
    // The operation performed:
    // 1. Return the page (one page before and after or the original position)
    // 2. Add current class to indicator
    // ==============================

    function onEnd(e) {

        if (movePrevent === true || stage !== 2){
            // event.preventDefault();
            // return false;
        } else {
            touchDown = false;
            options.direction === 'horizontal' ? endPos = e.pageX : endPos = e.pageY;


            if (options.swipeAnim === 'default' && !isHeadOrTail()) {
                $pages.removeClass('drag');

                if (Math.abs(endPos-startPos) <= 50) {
                    animatePage(curPage);
                    direction = 'stay';
                }
                else if (endPos >= startPos) {
                    animatePage(curPage-1);
                    direction = 'backward';
                }
                else if (endPos < startPos) {
                    animatePage(curPage+1);
                    direction = 'forward';
                }
            }



            else if (options.swipeAnim === 'cover' && !isHeadOrTail()){

                if (Math.abs(endPos-startPos) <= 50 && endPos >= startPos && options.drag) {
                    animatePage(curPage, 'keep-backward');
                    direction = 'stay';
                }
                else if (Math.abs(endPos-startPos) <= 50 && endPos < startPos && options.drag) {
                    animatePage(curPage, 'keep-forward');
                    direction = 'stay';
                }
                else if (Math.abs(endPos-startPos) > 50 && endPos >= startPos && options.drag) {
                    animatePage(curPage-1, 'backward');
                    direction = 'backward';
                }
                else if (Math.abs(endPos-startPos) > 50 && endPos < startPos && options.drag) {
                    animatePage(curPage+1, 'forward')
                    direction = 'forward';
                }
                else if (Math.abs(endPos-startPos) > 50 && endPos >= startPos && !options.drag) {
                    animatePage(curPage-1, 'backward');
                    direction = 'backward';
                }
                else if (Math.abs(endPos-startPos) > 50 && endPos < startPos && !options.drag) {
                    animatePage(curPage+1, 'forward')
                    direction = 'forward';
                }
            }


			if (options.indicator) {
                $($('.parallax-h-indicator ul li, .parallax-v-indicator ul li').removeClass('current').get(curPage)).addClass('current');
            }
            stage = 3;
        }

    }



    // Called when dragging
    // ==============================

    function dragToMove() {

        if (options.swipeAnim === 'default') {

            var temp = offset + endPos - startPos;

            options.direction === 'horizontal' ?
                $pages.css("-webkit-transform", "matrix(1, 0, 0, 1, " + temp + ", 0)") :
                $pages.css("-webkit-transform", "matrix(1, 0, 0, 1, 0, " + temp + ")");
        }



        else if (options.swipeAnim === 'cover') {

            var temp      =  endPos - startPos,
                $prevPage = $($pageArr[curPage-1]),
                $nextPage = $($pageArr[curPage+1]);

            $($pageArr).css({'z-index': 0});

            if (options.direction === 'horizontal' && endPos >= startPos) {
                $prevPage.css({
                    'z-index': 2,
                    'display': 'block',
                    '-webkit-transform': 'translateX('+(temp-pageWidth) +'px)'
                })
            }
            else if (options.direction === 'horizontal' && endPos < startPos) {
                $nextPage.css({
                    'z-index': 2,
                    'display': 'block',
                    '-webkit-transform': 'translateX('+(pageWidth+temp) +'px)'
                })
            }
            else if (options.direction === 'vertical' && endPos >= startPos) {
                $prevPage.css({
                    'z-index': 2,
                    'display': 'block',
                    '-webkit-transform': 'translateY('+ (temp-pageHeight) +'px)'
                })
            }
            else if (options.direction === 'vertical' && endPos < startPos) {
                $nextPage.css({
                    'z-index': 2,
                    'display': 'block',
                    '-webkit-transform': 'translateY('+ (pageHeight+temp) +'px)'
                })
            }
        }

    }




    // Called after dragging ends
    // ==============================

    function animatePage(newPage, action) {

        curPage = newPage;

        if (options.swipeAnim === 'default') {

            var newOffset = 0;
            options.direction === 'horizontal' ?
                newOffset = newPage * (-pageWidth) :
                newOffset = newPage * (-pageHeight);

            options.direction === 'horizontal' ?
                $pages.css({'-webkit-transform': 'matrix(1, 0, 0, 1, ' + newOffset + ', 0)'}) :
                $pages.css({'-webkit-transform': 'matrix(1, 0, 0, 1, 0, ' + newOffset + ')'});

        }



        else if (options.swipeAnim === 'cover') {

            if (action === 'keep-backward' && options.drag) {
                $pageArr.removeClass('drag');
                options.direction === 'horizontal' ?
                $($pageArr[curPage-1]).css({'-webkit-transform': 'translateX(-100%)'}) :
                $($pageArr[curPage-1]).css({'-webkit-transform': 'translateY(-100%)'})
            }
            else if (action === 'keep-forward' && options.drag) {
                $pageArr.removeClass('drag');
                options.direction === 'horizontal' ?
                $($pageArr[curPage+1]).css({'-webkit-transform': 'translateX(100%)'}) :
                $($pageArr[curPage+1]).css({'-webkit-transform': 'translateY(100%)'})
            }
            else if (action === 'forward' && options.drag) {
                $pageArr.removeClass('drag');
                $($pageArr[curPage-1]).addClass('back'); // Purely to hide after the animation ends, no animation defined in CSS is involved
                $pageArr[curPage].style.webkitTransform = 'translate(0, 0)';
            }
            else if (action === 'backward' && options.drag) {
                $pageArr.removeClass('drag');
                $($pageArr[curPage+1]).addClass('back');
                $pageArr[curPage].style.webkitTransform = 'translate(0, 0)';
            }
            else if (action === 'forward' && !options.drag) {
                $pages.addClass('animate');
                $($pageArr[curPage-1]).addClass('back');
                $($pageArr[curPage]).addClass('front').show();
            }
            else if (action === 'backward' && !options.drag) {
                $pages.addClass('animate');
                $($pageArr[curPage+1]).addClass('back');
                $($pageArr[curPage]).addClass('front').show();
            }

        }

        movePrevent = true;         // Cannot move during animation
        setTimeout(function() {
            movePrevent = false;
        }, 300);
    }





    // Add forward / backward state class
    // ==============================

    function addDirecClass() {
        if(options.direction === 'horizontal'){
            if (endPos >= startPos) {
                $pages.removeClass('forward').addClass('backward');
            } else if (endPos < startPos) {
                $pages.removeClass('backward').addClass('forward');
            }
        } else {
            if (endPos >= startPos) {
                $pages.removeClass('forward').addClass('backward');
            } else if (endPos < startPos) {
                $pages.removeClass('backward').addClass('forward');
            }
        }
    }





    // Turning forward and backward on the first page and the last page are not allowed
    // ==============================

    function isHeadOrTail() {
        if (options.direction === 'horizontal') {
            if ((endPos >= startPos && curPage === 0) ||
                (endPos <= startPos && curPage === pageCount-1)) {
                return true;
            }
        } else if ((endPos >= startPos && curPage === 0) ||
                (endPos <= startPos && curPage === pageCount-1)) {
            return true;
        }
        return false;
    }





    // Animation of current page
    // ==============================

    function animShow() {

        $animateDom.css({
        	'-webkit-animation': 'none',
        	'display': 'none'	// Solve the bug that some Android models do not automatically redraw the DOM
        	});


        $('.current [data-animation]').each(function(index, element){
            var $element    = $(element),
                $animation  = $element.attr('data-animation'),
                $duration   = $element.attr('data-duration') || 500,
                $timfunc    = $element.attr('data-timing-function') || 'ease',
                $delay      = $element.attr('data-delay') ?  $element.attr('data-delay') : 0;


			if ($animation === 'followSlide') {

				if (options.direction === 'horizontal' && direction === 'forward') {
					$animation = 'followSlideToLeft';
				}
				else if (options.direction === 'horizontal' && direction === 'backward') {
					$animation = 'followSlideToRight';
				}
				else if (options.direction === 'vertical' && direction === 'forward') {
					$animation = 'followSlideToTop';
				}
				else if (options.direction === 'vertical' && direction === 'backward') {
					$animation = 'followSlideToBottom';
				}

			}

            $element.css({
//              '-webkit-animation': $animation +' '+ $duration + 'ms ' + $timfunc + ' '+ $delay + 'ms both',

				'display': 'block',

				// In order to be compatible with animations that do not support Bezier curves, it needs to be disassembled and written
                // Two attributes with the same name are not allowed in strict mode, so we have to remove'use strict'
				'-webkit-animation-name': $animation,
				'-webkit-animation-duration': $duration + 'ms',
				'-webkit-animation-timing-function': 'ease',
				'-webkit-animation-timing-function': $timfunc,
				'-webkit-animation-delay': $delay + 'ms',
				'-webkit-animation-fill-mode': 'both'
            })
        });
    }



    // Event proxy binding
    // ==============================

    $(document)
        .on('touchstart', '.page', function(e) {
            onStart(e.changedTouches[0]);
        })
        .on('touchmove', '.page', function(e) {
            onMove(e.changedTouches[0]);
        })
        .on('touchend', '.page', function(e) {
            onEnd(e.changedTouches[0]);
        })
        .on('webkitAnimationEnd webkitTransitionEnd', '.pages', function() {

			if (direction !== 'stay') {
				setTimeout(function() {
	                $(".back").hide().removeClass("back");
	                $(".front").show().removeClass("front");
	                $pages.removeClass('forward backward animate');
	            }, 10);

	            $($pageArr.removeClass('current').get(curPage)).addClass('current');
	            options.onchange(curPage, $pageArr[curPage], direction);  // Execute callback function
	            animShow();
			}

        });


	$('.page *').on('webkitAnimationEnd', function() {
        event.stopPropagation();    // The event agent cannot prevent bubbling, so it must be bound to cancel
    })



    // Page (including resources) loaded
    // ==============================

    $(window).on("load", function() {

        if (options.loading) {
            $(".parallax-loading").remove();
            movePrevent = false;
            $($pageArr[curPage]).addClass('current');
            options.onchange(curPage, $pageArr[curPage], direction);
            animShow();
        }

        if (options.indicator) {
            movePrevent = false;

			var temp = options.direction === 'horizontal' ? 'parallax-h-indicator' : 'parallax-v-indicator';

            $('.wrapper').append('<div class='+temp+'></div>');
            var lists = '<ul>';
            for (var i=1; i<=pageCount; i++) {
                if (i===1) {
                    lists += '<li class="current"></li>'
                } else {
                    lists += '<li></li>'
                }
            }
            lists += '</ul>';
            $('.'+temp).append(lists);
        }

        if (options.arrow) {
            $pageArr.append('<span class="parallax-arrow"></span>');
            $($pageArr[pageCount-1]).find('.parallax-arrow').remove();
        }
    });




    // flip screen prompt
    // ==============================

    window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", function() {
    	if (window.orientation === 180 || window.orientation === 0) {
			options.orientationchange('portrait');
		}
		if (window.orientation === 90 || window.orientation === -90 ){
			options.orientationchange('landscape')
		}
    }, false);



}(jQuery)
