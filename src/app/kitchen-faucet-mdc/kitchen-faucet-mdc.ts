import {Component, ErrorHandler, NgModule} from '@angular/core';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatChipsModule} from '@angular/material/chips';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTableModule} from '@angular/material/table';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  template: `<button>Do the thing</button>`,
})
export class TestEntryComponent {
}

@Component({
  selector: 'kitchen-faucet-mdc',
  templateUrl: './kitchen-faucet-mdc.html',
})
export class KitchenFaucetMdc {
  constructor(dialog: MatDialog) {
    // dialog.open(TestEntryComponent);
  }
}

@NgModule({
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatTabsModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  declarations: [KitchenFaucetMdc, TestEntryComponent],
  exports: [KitchenFaucetMdc, TestEntryComponent],
  providers: [
    {
      // If an error is thrown asynchronously during server-side rendering it'll
      // get logged to stderr, but it won't cause the build to fail. We still
      // want to catch these errors so we provide an `ErrorHandler` that
      // re-throws the error and causes the process to exit correctly.
      provide: ErrorHandler,
      useValue: {handleError: ERROR_HANDLER},
    },
  ],
})
export class KitchenFaucetMdcModule {
  constructor(snackBar: MatSnackBar) {
    snackBar.open('Hello there');
  }
}

export function ERROR_HANDLER(error: Error) {
  throw error;
}
