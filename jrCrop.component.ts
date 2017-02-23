/**
 * jrCropController - A simple component to crop your images.
 * @version 0.0.1
 * @link
 * @author Artem Tkachenko
 * @license MIT
 */
import {
 Component,
 Output,
 OnInit,
 Input,
 ChangeDetectionStrategy,
 Injectable,
 EventEmitter,
 ElementRef,
 ViewChild
} from '@angular/core';

interface defaultOptions {
  width: number;
  height: number;
  orientation: number;
  aspectRatio: number;
  template: any;
};

interface touchOptions {
  min_pos_x: number;
  min_pos_y: number;
  max_pos_x: number;
  max_pos_y: number;
  cropper_ratio?: number;
  image_ratio?: number;
  transforming_correctX: number;
  transforming_correctY: number;
  scaleMin?: number;
  scaleMax: number;
};

@Component({
 selector: 'app-crop',
 styleUrls: ['./jrCrop.component.scss'],
 changeDetection: ChangeDetectionStrategy.OnPush,
 queries: {
   imageEl : ViewChild('imageEl'),
   cropSelect : ViewChild('cropSelect'),
   cropSeletcWrap : ViewChild('cropSeletcWrap'),
   cropBackgroundTop : ViewChild('cropBackgroundTop'),
   cropBackgroundBot : ViewChild('cropBackgroundBot'),
   cropBackgroundLeft : ViewChild('cropBackgroundLeft'),
   cropBackgroundRight : ViewChild('cropBackgroundRight'),
 },
 host: {
   '(pan)': 'touchEventHandler($event)',
   '(panend)': 'touchEventHandler($event)',
   '(pinch)': 'touchEventHandler($event)',
   '(pinchend)': 'touchEventHandler($event)',
   '(doubletap)': 'touchEventHandler($event)',
 },
 template: `
    <div #cropBackgroundTop [hidden]="options.template.hideAroundBox" class="jr-crop-background jr-crop-background-top jr-crop-background-horizontal"></div>
    <div #cropBackgroundBot [hidden]="options.template.hideAroundBox" class="jr-crop-background jr-crop-background-bottom jr-crop-background-horizontal"></div>
    <div #cropBackgroundLeft [hidden]="options.template.hideAroundBox" class="jr-crop-background jr-crop-background-left jr-crop-background-vertical"></div>
    <div #cropBackgroundRight [hidden]="options.template.hideAroundBox" class="jr-crop-background jr-crop-background-right jr-crop-background-vertical"></div>
    <div #cropSelect class="jr-crop-select">
      <div class="jr-crop-wrap">
        <div #cropSeletcWrap class="jr-crop-inner">
          <img class="jr-crop-img" #imageEl>
        </div>
      </div>
    </div>
  `
})
export class jrCropController implements OnInit {
  // private promise: any;
  private imgWidth: any;
  private imgHeight: any;
  // private imgSelect: any;
  // private imgFull: any;
  private posX: number;
  private posY: number;
  private scale: number;
  private last_scale: number;
  private last_posX: number;
  private last_posY: number;
  private requestAnimationFrame: Function;
  private cssTransfromPrefix: string;
  private defaultOptions: defaultOptions;
  private touch: touchOptions;

  private min_pos_x: number;
  private min_pos_y: number;
  private max_pos_x: number;
  private max_pos_y: number;
  private cropper_ratio?: number;
  private image_ratio?: number;
  private transforming_correctX: number;
  private transforming_correctY: number;
  private scaleMin?: number;
  private scaleMax: number;

  public options: any;
  public action: any;

  constructor(
    private el: ElementRef,
  ){
    this.imgWidth = null;
    this.imgHeight = null;

    // Values exposed by scaling and moving. Needed
    // to calculate the result of cropped image
    this.posX = 0;
    this.posY = 0;

    this.scale = 1;
    this.last_scale = 1;
    this.last_posX = 0;
    this.last_posY = 0;


    // Default option
    this.defaultOptions = {
      width: 0,
      height: 0,
      orientation: 0,
      aspectRatio: 16 / 9,
      template : {
        barHeight: 0,
        hideAroundBox: false
      }
    };

    // Touch config
    this.min_pos_x = 0;
    this.min_pos_y = 0;
    this.max_pos_x = 0;
    this.max_pos_y = 0;
    this.image_ratio = null;
    this.cropper_ratio = null;
    this.transforming_correctX = 0;
    this.transforming_correctY = 0;
    this.scaleMax = 1;
    this.scaleMin = null;

    // Crossbrowser fix
    this.cssTransfromPrefix = (<any>window).Hammer.prefixed(document.body.style, 'transform');

    this.requestAnimationFrame = (<any>window).window[Hammer.prefixed(window, 'requestAnimationFrame')] || function (callback) {
      (<any>window).window.setTimeout(callback, 1000 / 60);
    };
  }

  @ViewChild('imageEl') imageEl;
  @ViewChild('cropSelect') cropSelect;
  @ViewChild('cropSeletcWrap') cropSeletcWrap;
  // cropBackground around the image
  @ViewChild('cropBackgroundTop') cropBackgroundTop;
  @ViewChild('cropBackgroundBot') cropBackgroundBot;
  @ViewChild('cropBackgroundLeft') cropBackgroundLeft;
  @ViewChild('cropBackgroundRight') cropBackgroundRight;

  @Input('file') _file;
  @Input('config') _config;
  @Input('modal-d') _modalDismiss;
  @Input('modal-c') _modalClose;

  @Output() onError: EventEmitter<any> = new EventEmitter<any>();

  private assignDefaultOptions (_options) {
    // Apply default values to options.
    let options = Object.assign({}, this.defaultOptions, _options );

    if ( options.aspectRatio ) {

      if (!options.width && options.height) {
        options.width = 200;
      }

      if (options.width) {
        options.height = options.width / options.aspectRatio;
      } else if (options.height) {
        options.width = options.height * options.aspectRatio;
      }
    }

    return options;
  }

  private initialize () {

    this.loadImage()
      .then( (elem: any) => {

        let heigh = elem.image.naturalHeight || elem.image.height;
        let width = elem.image.naturalWidth || elem.image.width;
        // About orientation positions look here
        this.options.orientation = elem.fileOrientation;
        // http://i.stack.imgur.com/VGsAj.gif
        if ( this.options.orientation == 6 || this.options.orientation == 8 ) {
          this.imgWidth = heigh;
          this.imgHeight = width;
        } else {
          this.imgWidth = width;
          this.imgHeight = heigh;
        }

        // Set image startted position
        this.initImage();

        // Set source of image
        this.imageEl.nativeElement.src = elem.image.src;


        if ( ! this.options.template.hideAroundBox ) {
          let backHeight = (( window.innerHeight - this.options.template.barHeight - this.options.height ) / 2 ) - 2;
          let backWidth = (( window.innerWidth - this.options.width ) / 2 ) - 2;
          // 2px top/bottom border
          this.cropBackgroundTop.nativeElement.style.height = `${backHeight}px`;
          this.cropBackgroundBot.nativeElement.style.height = `${backHeight}px`;
          // Left
          this.cropBackgroundLeft.nativeElement.style.top = `${backHeight}px`;
          this.cropBackgroundLeft.nativeElement.style.bottom = `${backHeight}px`;
          this.cropBackgroundLeft.nativeElement.style.width = `${backWidth}px`;
          // right
          this.cropBackgroundRight.nativeElement.style.top = `${backHeight}px`;
          this.cropBackgroundRight.nativeElement.style.bottom = `${backHeight}px`;
          this.cropBackgroundRight.nativeElement.style.width = `${backWidth}px`;
        }
      })
      .catch( err => this.errorHandler(err) );
  }

  /**
  * Init the image in a center position
  */
  private initImage () {
    if (this.options.height < this.imgHeight || this.options.width < this.imgWidth) {
      let imgAspectRatio = this.imgWidth / this.imgHeight;
      let selectAspectRatio = this.options.width / this.options.height;

      if (selectAspectRatio > imgAspectRatio) {
        this.scale = this.last_scale = this.options.width / this.imgWidth;
      } else {
        this.scale = this.last_scale = this.options.height / this.imgHeight;
      }
    }

    let centerX = (this.imgWidth - this.options.width) / 2;
    let centerY = (this.imgHeight - this.options.height) / 2;

    this.posX = this.last_posX = -centerX;
    this.posY = this.last_posY = -centerY;

    // Set min scale (zoomOut) value
    this.image_ratio = this.imgWidth / this.imgHeight,
    this.cropper_ratio = this.options.width / this.options.height;

    if (this.cropper_ratio < this.image_ratio) {
      this.scaleMin = this.options.height / this.imgHeight;
    } else {
      this.scaleMin = this.options.width / this.imgWidth;
    }

    console.log('initImage', this)

    // Set css transform prop
    this.setImageTransform();
  }

  private setPosWithinBoundaries() {
    this.calcMaxPos();

    if (this.posX > this.min_pos_x) {
      this.posX = this.min_pos_x;
    }
    if (this.posX < this.max_pos_x) {
      this.posX = this.max_pos_x;
    }
    if (this.posY > this.min_pos_y) {
      this.posY = this.min_pos_y;
    }
    if (this.posY < this.max_pos_y) {
      this.posY = this.max_pos_y;
    }
  }

  /**
   * Calculate the minimum and maximum positions.
   * This took some headaches to write, good luck
   * figuring this out.
   */
  private calcMaxPos() {
    // Calculate current proportions of the image.
    let currWidth = this.scale * this.imgWidth;
    let currHeight = this.scale * this.imgHeight;

    // Images are scaled from the center
    this.min_pos_x = ( currWidth - this.imgWidth) / 2;
    this.min_pos_y = ( currHeight - this.imgHeight) / 2;
    this.max_pos_x = -( currWidth - this.min_pos_x - this.options.width);
    this.max_pos_y = -( currHeight - this.min_pos_y - this.options.height);
  }


  /**
  * This is where the magic happens
  */
  private touchEventHandler($event: TouchEvent | any){

    // Based on: http://stackoverflow.com/questions/18011099/pinch-to-zoom-using-hammer-js
    switch ($event.type) {
      case 'doubletap':
        if( this.scale > 1 ) {
          this.scale = this.last_scale = 1;
        } else {
          this.scale = this.last_scale = 2;
        }
        break;
      case 'pan':
        this.posX = this.last_posX + $event.deltaX - this.transforming_correctX;
        this.posY = this.last_posY + $event.deltaY - this.transforming_correctY;
        this.setPosWithinBoundaries();
        break;
      case 'panend':
        this.last_posX = this.posX;
        this.last_posY = this.posY;
        break;
      case 'pinch':
        this.scale = Math.max(this.scaleMin, Math.min(this.last_scale * $event.scale, this.scaleMax));
        this.setPosWithinBoundaries();
        break;
      case 'pinchend':
        this.last_scale = this.scale;

        // After scaling, hammerjs needs time to reset the deltaX and deltaY values,
        // when the user drags the image before this is done the image will jump.
        // This is an attempt to fix that.
        if ($event.deltaX > 1 || $event.deltaX < -1) {
          this.transforming_correctX = $event.deltaX;
          this.transforming_correctY = $event.deltaY;
        } else {
          this.transforming_correctX = 0;
          this.transforming_correctY = 0;
        }
        break;
    }

    this.setImageTransform();
  }

  /**
  * CSS TRANSFORM
  */
  private setImageTransform () {

    this.requestAnimationFrame( () => {
      let transform = `translate3d(${this.posX}px, ${this.posY}px, 0) scale3d(${this.scale}, ${this.scale}, 1)`;
      this.cropSeletcWrap.nativeElement.style[this.cssTransfromPrefix] = transform;
    });
  }


  /**
   * Calculate the new image from the values calculated by
   * user input. Return a canvas-object with the image on it.
   *
   * Note: It doesn't actually downsize the image, it only returns
   * a cropped version. Since there's inconsistenties in image-quality
   * when downsizing it's up to the developer to implement this. Preferably
   * on the server.
   */
  private resolveCropData () {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');

    let width = this.options.width / this.scale;
    let height = this.options.height / this.scale;

    // The full proportions
    let currWidth = this.imgWidth * this.scale;
    let currHeight = this.imgHeight * this.scale;

    // Because the top/left position doesn't take the scale of the image in
    // we need to correct this value.
    let correctX = (currWidth - this.imgWidth) / 2;
    let correctY = (currHeight - this.imgHeight) / 2;

    let cropX = (this.posX - correctX) / this.scale;
    let cropY = (this.posY - correctY) / this.scale;
        cropX = cropX < 0 ? cropX * ( - 1 ) : cropX;
        cropY = cropY < 0 ? cropY * ( - 1 ) : cropY;

    context.drawImage(this.imageEl.nativeElement, cropX, cropY);

    return {
      cropX,
      cropY,
      // correctX,
      // correctY,
      width,
      height,
      canvas
      // currWidth,
      // currHeight
    };
  }

  /**
  * @function getPictureOrientation - read exif data from local file
  * @return Promise - Return
  */
  private getPictureOrientation ( localFile ) {
    return new Promise((resolve, reject) => {
      // EXIF is LIBRARY load before angular
      if ( (<any>window).EXIF ) {

        (<any>window).EXIF.getData( localFile, function ( ) {
          resolve( (<any>window).EXIF.getTag( this , 'Orientation' ) );
        }, function () {
          reject('File read orientation error.')
        });
      } else {
        reject('EXIF libraby must be loaded before.')
      }
    });
  };

  /**
   * Load the image and return the element.
   * Return Promise that will fail when unable to load image.
   */
  private loadImage (): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if file exist
      if ( this._file ) {
        // Create instance FileReader
        let reader = new FileReader();
        let image = new Image();

        reader.onerror = (event: any) => reject(`Error ${event.target.error.code}`);
        reader.onabort = (event: any) => reject(`File read cancelled ${event.target.error.code}`);

        reader.onload = (event: any) => {
          // All ok and image is full loaded
          image.onload = () => {
            // Get file orientation
            this.getPictureOrientation( image )
              // Resolve promise when orientation loaded
              .then( (fileOrientation) => resolve({image, fileOrientation}) )
              // Reject promise when orientation can't be loaded
              .catch( (err) => reject(err) );
          };

          image.onerror = (e) => reject(`Can't load image`);

          // Load the image and resolve with the DOM node when done.
          image.src = event.target.result;
        };

        // Start reading local file
        reader.readAsDataURL( this._file );
      } else {
        // File no exist
        reject(`File doesn't exist`);
      }
    });
  }

  private errorHandler (error) {
    if ( this._modalDismiss ) {
      this._modalDismiss(error)
    } else {
      this.onError.emit(error)
    }
  }

  public getCropData(doneResovleFn: Function){
    if ( this._modalDismiss ) {
      this._modalDismiss( this.resolveCropData() );
    } else {
      return this.resolveCropData();
    }
  }

  ngOnInit (){
    // Check for the various File API support.
    if ( (<any>window).File && (<any>window).FileReader && (<any>window).Blob ) {
      // Get action and options from jrCropController
      this.options = this.assignDefaultOptions( this._config );
      // Set full screan
      this.el.nativeElement.style.height = `${window.innerHeight - this.options.template.barHeight}px`;
      this.cropSelect.nativeElement.style.height = `${this._config.height}px`;
      this.cropSelect.nativeElement.style.width = `${this._config.width}px`;
      // Start loading file
      this.initialize();
    } else {
      // Browser not support requred API
      this.errorHandler('The File APIs are not fully supported.');
    }

    console.log('jrCrop:', this )
  }
}
