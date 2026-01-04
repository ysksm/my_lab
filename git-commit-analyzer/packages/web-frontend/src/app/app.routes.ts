import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HotspotsComponent } from './components/hotspots/hotspots.component';
import { RiskAnalysisComponent } from './components/risk-analysis/risk-analysis.component';
import { FileHistoryComponent } from './components/file-history/file-history.component';
import { CoupledFilesComponent } from './components/coupled-files/coupled-files.component';
import { AuthorsComponent } from './components/authors/authors.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'hotspots', component: HotspotsComponent },
  { path: 'risk', component: RiskAnalysisComponent },
  { path: 'history', component: FileHistoryComponent },
  { path: 'coupled', component: CoupledFilesComponent },
  { path: 'authors', component: AuthorsComponent },
];
