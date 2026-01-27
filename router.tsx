import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import App from './App';

// Root route - renders App which handles all conditional rendering
const rootRoute = createRootRoute({
    component: App,
});

// Index route - matches root path
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
});

// Team route - /team/$teamSlug
const teamRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/team/$teamSlug',
});

// Project route - /team/$teamSlug/project/$projectId
const projectRoute = createRoute({
    getParentRoute: () => teamRoute,
    path: '/project/$projectId',
});

// Issue route - /team/$teamSlug/project/$projectId/issue/$issueId
const issueRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: '/issue/$issueId',
});

// Public route - /public/$slug
const publicRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/public/$slug',
});

// Accept invitation route - /accept-invite
const acceptInviteRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/accept-invite',
    component: () => import('./components/AcceptInvite').then(m => ({ default: m.AcceptInvite }))
});

// Reset password route - /reset-password
const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/reset-password',
    component: () => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage }))
});

// Build the route tree
const routeTree = rootRoute.addChildren([
    indexRoute,
    acceptInviteRoute,
    resetPasswordRoute,
    teamRoute.addChildren([
        projectRoute.addChildren([
            issueRoute,
        ]),
    ]),
    publicRoute,
]);

// Create and export the router
export const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
});

// Type declaration for router
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
