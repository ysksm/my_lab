import React from "react";
import {
  IResourceComponentsProps,
  useNavigation,
  useDelete,
} from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import { ITodo } from "../../interfaces";

export const TodoList: React.FC<IResourceComponentsProps> = () => {
  const { edit, show, create } = useNavigation();
  const { mutate: deleteOne } = useDelete();

  const columns = React.useMemo<ColumnDef<ITodo>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
        size: 60,
      },
      {
        id: "title",
        accessorKey: "title",
        header: "タイトル",
        cell: ({ getValue }) => {
          return (
            <div className="font-medium text-gray-900">
              {getValue() as string}
            </div>
          );
        },
      },
      {
        id: "description",
        accessorKey: "description",
        header: "説明",
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <div className="text-sm text-gray-600 truncate max-w-xs">
              {value || "-"}
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "ステータス",
        cell: ({ getValue }) => {
          const status = getValue() as ITodo["status"];
          const statusConfig = {
            pending: { label: "未着手", class: "bg-gray-100 text-gray-800" },
            in_progress: { label: "進行中", class: "bg-blue-100 text-blue-800" },
            completed: { label: "完了", class: "bg-green-100 text-green-800" },
          };
          const config = statusConfig[status];
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
              {config.label}
            </span>
          );
        },
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: "優先度",
        cell: ({ getValue }) => {
          const priority = getValue() as ITodo["priority"];
          const priorityConfig = {
            low: { label: "低", class: "bg-gray-100 text-gray-600" },
            medium: { label: "中", class: "bg-yellow-100 text-yellow-800" },
            high: { label: "高", class: "bg-red-100 text-red-800" },
          };
          const config = priorityConfig[priority];
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.class}`}>
              {config.label}
            </span>
          );
        },
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: "期限",
        cell: ({ getValue }) => {
          const date = getValue() as string;
          if (!date) return <span className="text-gray-400">-</span>;
          return new Date(date).toLocaleDateString("ja-JP");
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "操作",
        cell: ({ row }) => {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => show("todos", row.original.id)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                詳細
              </button>
              <button
                onClick={() => edit("todos", row.original.id)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                編集
              </button>
              <button
                onClick={() => {
                  if (window.confirm("このTODOを削除しますか？")) {
                    deleteOne({
                      resource: "todos",
                      id: row.original.id,
                    });
                  }
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                削除
              </button>
            </div>
          );
        },
      },
    ],
    [edit, show, deleteOne]
  );

  const {
    getHeaderGroups,
    getRowModel,
    setOptions,
    refineCore: {
      tableQueryResult: { data: tableData },
    },
    getState,
    setPageIndex,
    getCanPreviousPage,
    getPageCount,
    getCanNextPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable({
    columns,
  });

  setOptions((prev) => ({
    ...prev,
    meta: {
      ...prev.meta,
    },
  }));

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">TODOリスト</h1>
        <button
          onClick={() => create("todos")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          新規作成
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {!header.isPlaceholder &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageIndex(0)}
            disabled={!getCanPreviousPage()}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {"<<"}
          </button>
          <button
            onClick={() => previousPage()}
            disabled={!getCanPreviousPage()}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {"<"}
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!getCanNextPage()}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {">"}
          </button>
          <button
            onClick={() => setPageIndex(getPageCount() - 1)}
            disabled={!getCanNextPage()}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {">>"}
          </button>
        </div>
        <span className="text-sm text-gray-700">
          ページ {getState().pagination.pageIndex + 1} / {getPageCount()}
        </span>
        <select
          value={getState().pagination.pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}件表示
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};