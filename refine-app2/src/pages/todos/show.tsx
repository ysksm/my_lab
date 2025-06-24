import React from "react";
import {
  IResourceComponentsProps,
  useNavigation,
  useOne,
  useDelete,
} from "@refinedev/core";
import { ITodo } from "../../interfaces";

export const TodoShow: React.FC<IResourceComponentsProps> = () => {
  const { edit, list } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const { data, isLoading } = useOne<ITodo>({
    resource: "todos",
  });

  const todo = data?.data;

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!todo) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center text-gray-500">TODOが見つかりません</div>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: "未着手", class: "bg-gray-100 text-gray-800" },
    in_progress: { label: "進行中", class: "bg-blue-100 text-blue-800" },
    completed: { label: "完了", class: "bg-green-100 text-green-800" },
  };

  const priorityConfig = {
    low: { label: "低", class: "bg-gray-100 text-gray-600" },
    medium: { label: "中", class: "bg-yellow-100 text-yellow-800" },
    high: { label: "高", class: "bg-red-100 text-red-800" },
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <h1 className="text-2xl font-bold text-gray-900">TODO詳細</h1>
        <div className="flex gap-2">
          <button
            onClick={() => edit("todos", todo.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            編集
          </button>
          <button
            onClick={() => {
              if (window.confirm("このTODOを削除しますか？")) {
                deleteOne(
                  {
                    resource: "todos",
                    id: todo.id,
                  },
                  {
                    onSuccess: () => {
                      list("todos");
                    },
                  }
                );
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{todo.title}</h2>
            <div className="flex gap-2">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  statusConfig[todo.status].class
                }`}
              >
                {statusConfig[todo.status].label}
              </span>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  priorityConfig[todo.priority].class
                }`}
              >
                優先度: {priorityConfig[todo.priority].label}
              </span>
            </div>
          </div>

          {todo.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">説明</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{todo.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">期限</h3>
              <p className="text-gray-900">
                {todo.dueDate
                  ? new Date(todo.dueDate).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "未設定"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">ID</h3>
              <p className="text-gray-900">#{todo.id}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-gray-500">
            <p>
              作成日時:{" "}
              {new Date(todo.createdAt).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              更新日時:{" "}
              {new Date(todo.updatedAt).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => list("todos")}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          ← 一覧に戻る
        </button>
      </div>

      {todo.status === "completed" && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✅ このタスクは完了しています
          </p>
        </div>
      )}

      {todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== "completed" && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            ⚠️ このタスクは期限を過ぎています
          </p>
        </div>
      )}
    </div>
  );
};