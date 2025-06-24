import { useBreadcrumb } from "@refinedev/core";
import { Link } from "react-router";

export const Breadcrumb = () => {
  const { breadcrumbs } = useBreadcrumb();

  return (
    <nav className="bg-white px-6 py-3 border-b border-gray-200">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => {
          return (
            <li key={`breadcrumb-${breadcrumb.label}`} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {breadcrumb.href ? (
                <Link
                  to={breadcrumb.href}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-gray-700">{breadcrumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
