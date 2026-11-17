import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getRecipeById } from "@/server/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { TutorialEditor } from "@/components/recipes/tutorial-editor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  return { title: recipe ? `Cara Pembuatan ${recipe.name}` : "Cara Pembuatan" };
}

export default async function RecipeTutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) notFound();

  if (!recipe.version) {
    return (
      <div>
        <PageHeader
          eyebrow={
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
              Content System · Tutorial Produksi
            </span>
          }
          title={`Cara Pembuatan — ${recipe.name}`}
          description="Tutorial terhubung ke versi formula aktif. Lengkapi formula terlebih dahulu sebelum menyusun langkah produksi."
          actions={
            <ButtonLink href={`/resep/${recipe.id}`} variant="outline" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
              Kembali ke Studio
            </ButtonLink>
          }
        />
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="Resep belum memiliki versi formula"
          description="Tambahkan bahan dan simpan formula pertama. Setelah itu langkah produksi dan video tutorial bisa diisi."
          action={<ButtonLink href={`/resep/${recipe.id}/edit`}>Buat formula</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <TutorialEditor
      key={`${recipe.id}-${recipe.version.id}`}
      recipeId={recipe.id}
      recipeName={recipe.name}
      versionNo={recipe.version.versionNo}
      initialSteps={recipe.version.steps}
      initialVideos={recipe.videos}
    />
  );
}
