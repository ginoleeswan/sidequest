import { GroupStack } from '@/components/GroupStack';

/**
 * The standalone pages - You, the legal pages, the tools - grouped so
 * one web layout can put the phone's tab bar under them, and so native
 * can push them onto one another: You opens Account opens Terms. The
 * group is invisible in the URL: /you is still /you.
 */
export default GroupStack;
