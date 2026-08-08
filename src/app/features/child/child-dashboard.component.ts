import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GfBadge, GfCard, GfPageHeader, GfProgress, GfStatCard } from '../../shared/components/design-system';
@Component({
  standalone: true,
  imports: [GfBadge, GfCard, GfPageHeader, GfProgress, GfStatCard],
  template: `<gf-page-header title="Welcome back, Michael!" eyebrow="Week 3 · Today"
      ><p>Let's grow today. Every step you take matters.</p></gf-page-header
    >
    <div class="stats">
      <gf-stat-card label="Your contribution" value="240 points" /><gf-stat-card
        label="Team progress"
        value="1,680 points"
      /><gf-stat-card label="Program week" value="3 of 8" />
    </div>
    <section class="journey">
      <div>
        <gf-badge>Today's Journey</gf-badge>
        <h2>Small steps, meaningful growth</h2>
      </div>
      <gf-progress [value]="56" label="Team progress toward the quarter goal" />
      <div class="grid">
        @for (item of activities; track item.title) {
          <gf-card
            ><span class="icon" aria-hidden="true">{{ item.icon }}</span>
            <p>{{ item.eyebrow }}</p>
            <h3>{{ item.title }}</h3>
            <span>{{ item.detail }}</span
            ><a [href]="item.link">{{ item.action }} <span aria-hidden="true">→</span></a></gf-card
          >
        }
      </div>
    </section>
    <gf-card
      ><h2>Your team is making progress!</h2>
      <p>
        Everyone's participation helps the team grow. Private notes, feelings, ratings, and school information are never
        shared here.
      </p></gf-card
    >`,
  styles: [
    `
      .stats,
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .journey {
        background: #fff8e7;
        border-radius: var(--radius-xl);
        padding: clamp(1rem, 3vw, 2rem);
        margin-bottom: 1.5rem;
      }
      .journey > div:first-child {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .grid {
        grid-template-columns: repeat(2, 1fr);
        margin: 1.5rem 0 0;
      }
      .icon {
        font-size: 2rem;
      }
      h3 {
        margin: 0.2rem 0;
      }
      gf-card a {
        display: inline-block;
        margin-top: 1rem;
        font-weight: 800;
        color: var(--brand);
      }
      @media (max-width: 850px) {
        .stats {
          grid-template-columns: 1fr;
        }
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildDashboardComponent {
  readonly activities = [
    {
      icon: '♡',
      eyebrow: 'Private check-in',
      title: 'Heart & Mind',
      detail: 'How are you feeling today?',
      action: 'Check in',
      link: '/child/today',
    },
    {
      icon: '☀',
      eyebrow: 'Daily gratitude',
      title: 'What made you smile?',
      detail: 'Write one thing you are thankful for.',
      action: 'Share gratitude',
      link: '/child/today',
    },
    {
      icon: '🌱',
      eyebrow: '3 of 5 complete',
      title: 'Character Growth',
      detail: 'Your honest reflection is what matters.',
      action: 'Continue',
      link: '/child/character',
    },
    {
      icon: '📖',
      eyebrow: 'Bible Time',
      title: 'Read and reflect',
      detail: 'Participation matters—not quiz accuracy.',
      action: 'Begin',
      link: '/child/bible',
    },
  ] as const;
}
