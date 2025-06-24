import type { PropsWithChildren } from "react";
import { Breadcrumb } from "../breadcrumb";
import { Menu } from "../menu";

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Menu />
      <div className="flex-1 overflow-auto">
        <Breadcrumb />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
