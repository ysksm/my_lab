import { useMenu } from "@refinedev/core";
import { NavLink } from "react-router";

export const Menu = () => {
  const { menuItems } = useMenu();

  return (
    <nav className="p-4 bg-gray-50 border-r border-gray-200 min-h-screen">
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.route ?? "/"}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
