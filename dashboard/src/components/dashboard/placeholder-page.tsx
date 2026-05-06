export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="panel overflow-hidden p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase text-secondary">Modulo protegido</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[42px] text-primary">{title}</h1>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">
          Estrutura visual e navegacao ja preparadas. A implementacao funcional deste modulo entra
          nas proximas tasks mantendo o mesmo sistema de superficie, status e acoes.
        </p>
      </div>
    </section>
  );
}
