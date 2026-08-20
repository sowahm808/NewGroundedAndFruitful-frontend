import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'gf-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<a class="skip" href="#main-content">Skip to content</a>
    <div id="main-content" tabindex="-1"><router-outlet /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
