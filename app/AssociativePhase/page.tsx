
export default function AssociativePhasePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-emerald-700">Associative Phase</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">
          文節の構成要素選択演習
        </h1>
        <p className="mt-4 leading-7 text-slate-700">
          ここではDBを使わず、画面上の状態だけで答え合わせをします。
          クリック操作が必要なので、演習部分だけ Client Component にしています。
        </p>
      </div>

      {/* 演習コンポーネントをここに配置 */}
    </main>
  );
} 
