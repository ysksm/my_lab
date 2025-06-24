import { GitHubBanner, Refine, WelcomePage } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import "./App.css";
import { Layout } from "./components/layout";
import { TodoList, TodoCreate, TodoEdit, TodoShow } from "./pages/todos";

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
      <RefineKbarProvider>
        <DevtoolsProvider>
          <Refine
            dataProvider={dataProvider("https://api.fake-rest.refine.dev")}
            routerProvider={routerBindings}
            resources={[
              {
                name: "todos",
                list: "/todos",
                create: "/todos/create",
                edit: "/todos/edit/:id",
                show: "/todos/show/:id",
                meta: {
                  canDelete: true,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              useNewQueryKeys: true,
              projectId: "Xi8kne-1oXBBp-wvHDqd",
            }}
          >
            <Routes>
              <Route
                element={
                  <Layout>
                    <Outlet />
                  </Layout>
                }
              >
                <Route index element={<WelcomePage />} />
                <Route path="/todos">
                  <Route index element={<TodoList />} />
                  <Route path="create" element={<TodoCreate />} />
                  <Route path="edit/:id" element={<TodoEdit />} />
                  <Route path="show/:id" element={<TodoShow />} />
                </Route>
              </Route>
            </Routes>
            <RefineKbar />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
          <DevtoolsPanel />
        </DevtoolsProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
