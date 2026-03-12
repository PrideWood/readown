import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './style.css';

import ExamTypeCards from './components/ExamTypeCards.vue';
import SessionList from './components/SessionList.vue';
import SectionList from './components/SectionList.vue';
import SectionTypeList from './components/SectionTypeList.vue';
import SectionRenderer from './components/SectionRenderer.vue';
import NotebookPage from './components/NotebookPage.vue';
import SkillPracticeCards from './components/SkillPracticeCards.vue';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ExamTypeCards', ExamTypeCards);
    app.component('SessionList', SessionList);
    app.component('SectionList', SectionList);
    app.component('SectionTypeList', SectionTypeList);
    app.component('SectionRenderer', SectionRenderer);
    app.component('NotebookPage', NotebookPage);
    app.component('SkillPracticeCards', SkillPracticeCards);
  }
};

export default theme;
