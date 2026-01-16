/**
 * Issue data for seed script
 */

import { generateId, toISOString, randomDateLastDays, randomItem, randomItems } from './helpers';

export type IssueStatus = 'Backlog' | 'Todo' | 'In Progress' | 'In Review' | 'Done' | 'Canceled';
export type IssuePriority = 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';

export interface IssueSeed {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  project_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  due_date: string | null;
}

export interface IssueAssigneeSeed {
  issue_id: string;
  user_id: string;
}

// Issue templates for different teams
const engineeringIssueTemplates: Array<{
  title: string;
  description: string;
  priority: IssuePriority;
}> = [
  {
    title: 'Implementasi user authentication dengan JWT',
    description: 'Buat sistem authentication lengkap dengan JWT access token dan refresh token. Handle login, register, logout, dan token refresh. Pastikan security best practices seperti httpOnly cookies dan CSRF protection.',
    priority: 'Urgent',
  },
  {
    title: 'Bug: Login gagal dengan password yang valid',
    description: 'User melaporkan tidak bisa login meskipun password sudah benar. Error muncul setelah deploy terakhir. Butuh investigasi segera karena blocking production.',
    priority: 'Urgent',
  },
  {
    title: 'Fix SQL injection vulnerability di search endpoint',
    description: 'Security audit menemukan potential SQL injection di endpoint /api/v1/search. Harus di patch segera dengan proper parameterized queries.',
    priority: 'Urgent',
  },
  {
    title: 'Buat product catalog API endpoint',
    description: 'Develop REST API untuk product catalog dengan fitur pagination, filtering, dan sorting. Return data dalam format yang sesuai dengan frontend requirements.',
    priority: 'High',
  },
  {
    title: 'Integrasi payment gateway Midtrans',
    description: 'Integrasikan Midtrans payment gateway untuk checkout. Handle payment status callbacks, refund, dan handling payment failures.',
    priority: 'High',
  },
  {
    title: 'Optimasi query untuk product list',
    description: 'Query product list saat ini lambat (>3s) untuk database dengan 10k+ products. Perlu optimasi dengan proper indexing dan query restructuring.',
    priority: 'High',
  },
  {
    title: 'Implementasi shopping cart di frontend',
    description: 'Buat shopping cart component dengan fitur add/remove item, quantity adjustment, dan price calculation. State management pakai React context atau zustand.',
    priority: 'Medium',
  },
  {
    title: 'Unit testing untuk user service',
    description: 'Tulis unit test untuk seluruh function di user service menggunakan Jest. Coverage target minimal 80%.',
    priority: 'Medium',
  },
  {
    title: 'Setup CI/CD pipeline dengan GitHub Actions',
    description: 'Configure GitHub Actions untuk automated testing, linting, dan deployment ke staging environment pada setiap PR.',
    priority: 'Medium',
  },
  {
    title: 'Update dependencies ke versi terbaru',
    description: 'Update semua npm packages ke versi terbaru dan test untuk breaking changes. particularly React, TypeScript, dan Express.',
    priority: 'Low',
  },
  {
    title: 'Refactor user controller untuk better error handling',
    description: 'User controller saat ini error handling kurang konsisten. Refactor untuk menggunakan custom error classes dan middleware error handling.',
    priority: 'Low',
  },
  {
    title: 'Add API documentation dengan OpenAPI/Swagger',
    description: 'Document seluruh API endpoints menggunakan OpenAPI specification dan integrate Swagger UI untuk developer documentation.',
    priority: 'Low',
  },
  {
    title: 'Investigate memory leak di WebSocket handler',
    description: 'Setelah beberapa jam running, memory usage terus naik. Kemungkinan ada leak di WebSocket connection handler.',
    priority: 'Medium',
  },
  {
    title: 'Buat admin dashboard untuk product management',
    description: 'Develop admin dashboard page untuk CRUD operations pada products. Include image upload, category management, dan inventory tracking.',
    priority: 'Medium',
  },
  {
    title: 'Implement real-time order status update',
    description: 'Gunakan WebSocket untuk push order status updates ke frontend saat status berubah (pending → processing → shipped → delivered).',
    priority: 'High',
  },
];

const designIssueTemplates: Array<{
  title: string;
  description: string;
  priority: IssuePriority;
}> = [
  {
    title: 'Redesign logo dengan 3 konsep berbeda',
    description: 'Buat 3 konsep logo baru yang modern dan memorable. Setiap konsep harus punya variasi warna dan aplikasi di berbagai media (digital, print, merchandise).',
    priority: 'Urgent',
  },
  {
    title: 'Fix: Icon tidak terbaca di dark mode',
    description: 'Beberapa icon tidak visible atau kontrasnya kurang saat dark mode diaktifkan. Perlu update icon colors untuk better contrast.',
    priority: 'Urgent',
  },
  {
    title: 'Brand guideline v2.0',
    description: 'Compile dan update brand guideline lengkap termasuk logo usage, color palette, typography, imagery style, dan do\'s and don\'ts.',
    priority: 'High',
  },
  {
    title: 'Design system component: Button dan Input',
    description: 'Buat design system documentation untuk Button dan Input components dengan berbagai variants, states, dan sizes. Include code snippets.',
    priority: 'High',
  },
  {
    title: 'UI mockups untuk checkout flow',
    description: 'Desain seluruh screens untuk checkout flow: cart → shipping info → payment → confirmation. Focus pada conversion dan user experience.',
    priority: 'High',
  },
  {
    title: 'User interview untuk product discovery',
    description: 'Conduct 5 user interviews untuk understand pain points dan requirements untuk produk baru. Prepare interview guide dan report findings.',
    priority: 'Medium',
  },
  {
    title: 'Illustrations untuk onboarding flow',
    description: 'Buat 4-5 illustrations untuk onboarding screens yang engaging dan mudah dipahami. Style harus sesuai dengan brand personality.',
    priority: 'Medium',
  },
  {
    title: 'Prototype testing untuk homepage redesign',
    description: 'Buat Figma prototype untuk homepage redesign baru dan conduct usability testing dengan 5 users. Gather feedback dan iterate.',
    priority: 'Medium',
  },
  {
    title: 'Update marketing materials dengan brand baru',
    description: 'Refresh seluruh marketing materials (brochure, one-pager, presentation template) dengan logo dan brand identity yang baru.',
    priority: 'Low',
  },
  {
    title: 'Create social media templates',
    description: 'Design templates untuk Instagram dan LinkedIn posts yang sesuai dengan brand guidelines. Include template untuk announcements, tips, dan testimonials.',
    priority: 'Low',
  },
  {
    title: 'Icon set untuk mobile app',
    description: 'Buat custom icon set untuk mobile app dengan 50+ icons. Pastikan konsisten style dan bisa digunakan di berbagai ukuran.',
    priority: 'Medium',
  },
];

const marketingIssueTemplates: Array<{
  title: string;
  description: string;
  priority: IssuePriority;
}> = [
  {
    title: 'Campaign launch: Social media content calendar',
    description: 'Buat content calendar untuk 1 bulan penuh dengan daily posts untuk Instagram dan LinkedIn. Include post types, copy, hashtags, dan visual briefs.',
    priority: 'Urgent',
  },
  {
    title: 'Blog post: "Cara Memilih Tech Stack untuk Startup 2025"',
    description: 'Tulis blog post komprehensif 1500+ words tentang considerations dalam memilih tech stack. SEO-optimized dengan target keyword "tech stack untuk startup".',
    priority: 'Urgent',
  },
  {
    title: 'Email newsletter: Q1 Product Updates',
    description: 'Draft email newsletter untuk update produk Q1. Highlight new features, improvements, dan upcoming roadmap. Target open rate 25%+.',
    priority: 'High',
  },
  {
    title: 'Google Ads campaign setup',
    description: 'Setup dan optimize Google Ads campaign untuk launch. Configure targeting, ad groups, ad copy, dan budget allocation. Monitor daily dan adjust.',
    priority: 'High',
  },
  {
    title: 'Analytics report: Desember performance',
    description: 'Compile monthly analytics report termasuk traffic, conversion, engagement metrics, dan key insights. Include recommendations untuk improvement.',
    priority: 'High',
  },
  {
    title: 'Influencer outreach: 10 target micro-influencers',
    description: 'Identify dan reach out ke 10 micro-influencers di tech/startup space. Negotiate collaboration terms dan brief campaign requirements.',
    priority: 'Medium',
  },
  {
    title: 'Event planning: Tech Talk Jakarta',
    description: 'Plan dan coordinate tech talk event di Jakarta. Venue, speakers, registration, catering, dan promotion. Target 100+ attendees.',
    priority: 'Medium',
  },
  {
    title: 'SEO keyword research untuk Q2',
    description: 'Conduct comprehensive keyword research untuk content strategy Q2. Identify high-value keywords dengan good search volume dan achievable difficulty.',
    priority: 'Medium',
  },
  {
    title: 'Update website copy dengan messaging baru',
    description: 'Refresh homepage dan key landing pages dengan updated value proposition dan messaging yang lebih resonan dengan target audience.',
    priority: 'Low',
  },
  {
    title: 'Create case study: Client success story',
    description: 'Develop detailed case study tentang client success story. Include challenge, solution, results, dan testimonial. Format untuk website dan sales deck.',
    priority: 'Low',
  },
  {
    title: 'Social media audit dan recommendations',
    description: 'Audit seluruh social media presence dan competitive analysis. Provide recommendations untuk content strategy, posting frequency, dan engagement tactics.',
    priority: 'Low',
  },
];

/**
 * Generate issues for projects
 */
export function generateIssues(
  projects: Array<{ id: string; identifier: string; team_id: string }>,
  teamName: string,
  teamMemberIds: string[],
  issueNumber: { [key: string]: number }
): {
  issues: IssueSeed[];
  assignees: IssueAssigneeSeed[];
} {
  const teamProjects = projects.filter(p => {
    if (teamName === 'Engineering') return ['ECO', 'MOB'].includes(p.identifier);
    if (teamName === 'Design') return ['TRA', 'BNK'].includes(p.identifier);
    if (teamName === 'Marketing') return ['STA', 'SEO'].includes(p.identifier);
    return false;
  });

  const templates = teamName === 'Engineering'
    ? engineeringIssueTemplates
    : teamName === 'Design'
    ? designIssueTemplates
    : marketingIssueTemplates;

  const issues: IssueSeed[] = [];
  const assignees: IssueAssigneeSeed[] = [];

  // Status distribution for ~12 issues per project
  const statusPool: IssueStatus[] = [
    'Backlog', 'Backlog', 'Backlog',
    'Todo', 'Todo', 'Todo',
    'In Progress', 'In Progress', 'In Progress',
    'In Review', 'In Review',
    'Done', 'Done',
    'Canceled',
  ];

  let templateIndex = 0;
  const parentIssues: string[] = [];

  for (const project of teamProjects) {
    const issueCount = 10 + Math.floor(Math.random() * 4); // 10-13 issues per project

    // Initialize issue number for this project if not set
    if (!issueNumber[project.identifier]) {
      issueNumber[project.identifier] = 0;
    }

    for (let i = 0; i < issueCount; i++) {
      const template = templates[templateIndex % templates.length];
      templateIndex++;

      // Create issue number for this project (ECO-001, MOB-001, etc.)
      const projectIssueNum = ++issueNumber[project.identifier];
      const identifier = `${project.identifier}-${String(projectIssueNum).padStart(3, '0')}`;

      const status = i < statusPool.length ? statusPool[i] : statusPool[statusPool.length - 1];
      const isParent = Math.random() > 0.7; // 30% chance to be parent
      const parentForThis = isParent && parentIssues.length > 0 ? randomItem(parentIssues) : null;

      const now = new Date();
      const created = randomDateLastDays(60);
      const updated = randomDateLastDays(7);
      const dueDate = status === 'Done'
        ? toISOString(randomDateLastDays(30))
        : status === 'In Progress' || status === 'In Review'
        ? toISOString(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
        : null;

      const issue: IssueSeed = {
        id: generateId('iss'),
        identifier,
        title: template.title,
        description: template.description,
        status,
        priority: template.priority,
        project_id: project.id,
        parent_id: parentForThis,
        created_at: toISOString(created),
        updated_at: toISOString(updated),
        start_date: status !== 'Backlog' && status !== 'Canceled' ? toISOString(created) : null,
        due_date: dueDate,
      };

      issues.push(issue);

      if (isParent && status !== 'Canceled') {
        parentIssues.push(issue.id);
      }

      // Add assignees (1-3 per issue)
      const numAssignees = Math.random() > 0.6 ? 2 : (Math.random() > 0.8 ? 3 : 1);
      const issueAssignees = randomItems(teamMemberIds, numAssignees);
      for (const assigneeId of issueAssignees) {
        assignees.push({ issue_id: issue.id, user_id: assigneeId });
      }

      // Create subtasks for parent issues
      if (isParent && status !== 'Canceled' && status !== 'Backlog') {
        const subtaskCount = 2 + Math.floor(Math.random() * 2); // 2-3 subtasks
        for (let j = 0; j < subtaskCount; j++) {
          const subtaskNum = ++issueNumber[project.identifier];
          const subtaskIdentifier = `${project.identifier}-${String(subtaskNum).padStart(3, '0')}`;

          const subtask: IssueSeed = {
            id: generateId('iss'),
            identifier: subtaskIdentifier,
            title: `Subtask: ${template.title}`,
            description: 'Subtask dari parent issue.',
            status: randomItem(['Todo', 'In Progress', 'Done']),
            priority: template.priority,
            project_id: project.id,
            parent_id: issue.id,
            created_at: toISOString(created),
            updated_at: toISOString(updated),
            start_date: toISOString(created),
            due_date: dueDate,
          };

          issues.push(subtask);

          // Assign subtask to same assignees as parent
          for (const assigneeId of issueAssignees) {
            assignees.push({ issue_id: subtask.id, user_id: assigneeId });
          }
        }
      }
    }
  }

  return { issues, assignees };
}
