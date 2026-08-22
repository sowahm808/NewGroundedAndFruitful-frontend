import { ChangeDetectionStrategy, Component, EventEmitter, Output, effect, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentContextStore } from '../parent-context.store';

/** A relationship-safe picker backed by the shared, session-scoped Parent context. */
@Component({
  selector: 'gf-parent-child-scope',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="scope" aria-labelledby="relationship-scope-title">
    <h2 id="relationship-scope-title">Active relationship</h2>
    @if (context.state().status === 'loading' || context.state().status === 'idle') {
      <p class="muted" role="status">Checking active relationships…</p>
    } @else if (context.state().status === 'empty') {
      <p class="muted">No linked children are available.</p>
    } @else if (context.state().status === 'forbidden') {
      <p role="alert">Your account cannot access linked-child relationships in this workspace.</p>
    } @else if (context.state().status === 'dependency_error' || context.state().status === 'contract_error') {
      <p role="alert">Linked children could not be loaded.</p>
      <button type="button" (click)="context.retry()">Try again</button>
    } @else if (context.state().status === 'ready') {
      <label for="scope-child"
        >View for
        <select id="scope-child" [formControl]="selection">
          <option value="">Choose a linked child</option>
          @for (child of context.children(); track child.id) {
            <option [value]="child.id">{{ child.displayName }}</option>
          }
        </select>
      </label>
      <p class="muted">{{ context.children().length }} linked children shown</p>
    }
  </section>`,
  styleUrl: '../parent-feature.styles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildScopeComponent {
  readonly context = inject(ParentContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @Output() readonly childChange = new EventEmitter<string>();
  readonly selection = new FormControl('', { nonNullable: true });
  constructor() {
    this.selection.valueChanges.subscribe((id) => this.choose(id));
    effect(() => {
      if (this.context.state().status !== 'ready') {
        this.selection.setValue('', { emitEvent: false });
        this.childChange.emit('');
        return;
      }
      const requested = this.route.snapshot.queryParamMap.get('child') ?? '';
      const selected = requested && this.context.select(requested) ? requested : (this.context.selectedChildId() ?? '');
      this.selection.setValue(selected, { emitEvent: false });
      this.childChange.emit(selected);
    });
  }
  private choose(id: string): void {
    const safe = this.context.select(id || null) ? id : '';
    if (safe !== id) this.selection.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { child: safe || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.childChange.emit(safe);
  }
}
