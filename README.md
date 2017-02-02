# jrCropController #

jrCropController - A simple component to crop your images, inspired by whatsapp and telegram. This is the fork of jr-crop plugin by JrSchild (https://github.com/JrSchild/jr-crop)

### Depending on ###
  - [Angular.io](https://angular.io/)
  - [Hammerjs](http://hammerjs.github.io)
  - [EXIF](https://ru.wikipedia.org/wiki/EXIF)


### Installation

```sh
$ npm i @types/hammerjs --save
$ npm i hammerjs --save
$ npm i git+https://tkachenko_artem@bitbucket.org/tkachenko_artem/jrcrop.git --save
```
```html
// index.html
<script src="https://hammerjs.github.io/dist/hammer.min.js"></script>
<script src="https://hammerjs.github.io/dist/hammer-time.min.js"></script>
```

```javascript
import { jrCropController } from 'jr-crop';

@NgModule({
  ...
  declarations: [
    jrCropController
  ]
  ...
```
```javascript
cropFile:File from input
cropConfig = {
    width: 320,
    height: 320,
    aspectRatio: 1,
    template: {
        // Fix header and footer aspect
        barHeight: 49
        // Show/Hide shadow around image
        hideAroundBox: true,
    }
};

// Open modal
this._modalService.open(this.cropModalPicture).result.then(
    // cropData { cropX, cropY, width, height };
    (cropData) => console.log(cropData),
    // Reason error processing image etc.
    (reason) => console.log(reason),
);
```
```html
// Useing modal
<template ngbModalContainer #cropModalPicture let-c="close" let-d="dismiss">
  <button (click)="d('cropModalPicture Close')"></button>
  <button (click)="imageCropper.getCropData()"></button>
  <app-crop #imageCropper [modal-d]="d" [modal-c]="c" [file]="cropModalPicture.cropFile" [config]="cropModalPicture.cropConfig"></app-crop>
</template>

// Without modal
<button (click)="imageCropper.getCropData()"></button>
<app-crop #imageCropper [file]="cropFile" [config]="cropConfig"></app-crop>
```
