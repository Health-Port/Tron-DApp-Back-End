import { FuseNavigation } from '@fuse/types';

export const navigation: FuseNavigation[] = [
    {
        id: 'myaccount',
        title: 'MY ACCOUNT',
        type: 'item',
        icon: '',
        url: '/login'
    },
    {
        id: 'about',
        title: 'ABOUT',
        type: 'item',
        icon: 'about',
        url: '/home/about'
    },
    {
        id: 'contact',
        title: 'CONTACT',
        type: 'item',
        icon: 'contact',
        url: '/home/contact'
    },
    {
        id: 'whitepaper',
        title: 'WHITEPAPER',
        type: 'item',
        icon: 'whitepaper',
        url: 'https://medium.com/@healthport/health-port-white-paper-3cf16da99034',
        externalUrl: true,
        openInNewTab: true
    },
    {
        id: 'source-code',
        title: 'SOURCE CODE',
        type: 'item',
        icon: 'gitrepo',
        url: 'https://github.com/Health-Port',
        externalUrl: true,
        openInNewTab: true
    },
    {
        id: 'blog',
        title: 'BLOG',
        type: 'item',
        icon: 'blog',
        url: 'https://medium.com/@healthport',
        externalUrl: true,
        openInNewTab: true
    },
    {
        id: 'signup',
        title: 'SIGN UP',
        type: 'item',
        icon: 'signup',
        url: '/signup'
    }
];
