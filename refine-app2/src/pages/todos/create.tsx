import React from "react";
import { IResourceComponentsProps, useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { ITodo } from "../../interfaces";

export const TodoCreate: React.FC<IResourceComponentsProps> = () => {
  const { list } = useNavigation();
  const {
    refineCore: { onFinish },
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ITodo>();

  const watchStatus = watch("status");
  const watchPriority = watch("priority");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">TODO作成</h1>
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title", {
              required: "タイトルは必須です",
              maxLength: {
                value: 100,
                message: "タイトルは100文字以内で入力してください",
              },
            })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: プロジェクトの設計書を作成する"
            autoComplete="off"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            説明
          </label>
          <textarea
            {...register("description", {
              maxLength: {
                value: 500,
                message: "説明は500文字以内で入力してください",
              },
            })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="タスクの詳細な説明を入力してください"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            タスクの詳細、背景、完了条件などを記載できます
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              ステータス <span className="text-red-500">*</span>
            </label>
            <select
              {...register("status", { required: "ステータスを選択してください" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue="pending"
            >
              <option value="pending">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
            <div className="mt-1 text-xs text-gray-500">
              {watchStatus === "pending" && "これから着手するタスク"}
              {watchStatus === "in_progress" && "現在取り組んでいるタスク"}
              {watchStatus === "completed" && "完了したタスク"}
            </div>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              優先度 <span className="text-red-500">*</span>
            </label>
            <select
              {...register("priority", { required: "優先度を選択してください" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue="medium"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
            )}
            <div className="mt-1 text-xs text-gray-500">
              {watchPriority === "low" && "急ぎではないタスク"}
              {watchPriority === "medium" && "通常の優先度"}
              {watchPriority === "high" && "最優先で対応が必要"}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
            期限
          </label>
          <input
            {...register("dueDate", {
              validate: (value) => {
                if (!value) return true;
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                  return "期限は今日以降の日付を選択してください";
                }
                return true;
              },
            })}
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={new Date().toISOString().split("T")[0]}
          />
          {errors.dueDate && (
            <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            タスクの完了期限を設定できます（任意）
          </p>
        </div>

        <div className="border-t pt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => list("todos")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            作成
          </button>
        </div>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 ヒント</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• タイトルは具体的で分かりやすく記載しましょう</li>
          <li>• 優先度は他のタスクとの相対的な重要度で設定します</li>
          <li>• 期限を設定すると、計画的にタスクを管理できます</li>
        </ul>
      </div>
    </div>
  );
};