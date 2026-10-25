import { Routes } from '@angular/router';
import { ListJobPostingsComponent } from './recruitment/pages/list-job-postings/list-job-postings.component';
import { DetailJobPostingComponent } from './recruitment/pages/detail-job-posting/detail-job-posting.component';

export const routes: Routes = [
  { path: 'vacantes', component: ListJobPostingsComponent },
  { path: 'vacantes/:id', component: DetailJobPostingComponent }
];ng