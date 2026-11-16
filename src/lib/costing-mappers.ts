import type { IngredientInput, PriceRecordInput, RecipeInput } from "@ufc/costing";
import type { IngredientView, RecipeView } from "@/lib/types";

/** Mapper murni (bisa dipakai client untuk preview dan server untuk kalkulasi resmi). */
export function toDomainIngredient(ingredient: IngredientView): IngredientInput {
  return {
    id: ingredient.id,
    name: ingredient.name,
    sku: ingredient.sku,
    category: ingredient.category,
    baseUnit: ingredient.baseUnit,
    baseDimension: ingredient.baseDimension,
    discrete: ingredient.discrete,
    conversions: ingredient.conversions.map((conversion) => ({
      fromUnit: conversion.fromUnit,
      toUnit: conversion.toUnit,
      factor: conversion.factor,
    })),
  };
}

export function toDomainRecipe(recipe: RecipeView): RecipeInput | null {
  if (!recipe.version) return null;
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    status: recipe.status,
    isSubrecipe: recipe.isSubrecipe,
    yieldQty: recipe.version.yieldQty,
    yieldUnit: recipe.version.yieldUnit,
    unitWeightG: recipe.version.unitWeightG,
    yieldLossPct: recipe.version.yieldLossPct,
    items: recipe.version.items.map((item) => ({
      id: item.id,
      type: item.itemType,
      refId: item.refId,
      name: item.label,
      qty: item.qty,
      unit: item.unit,
      discrete: item.discrete,
      rounding: item.rounding,
      nonLinearScaling: item.nonLinearScaling,
      note: item.note,
      overheadKind: item.overheadKind,
      overheadValue: item.overheadValue,
      sortOrder: item.sortOrder,
    })),
  };
}

export function buildPriceBook(ingredients: IngredientView[]): Record<string, PriceRecordInput[]> {
  const book: Record<string, PriceRecordInput[]> = {};
  for (const ingredient of ingredients) {
    book[ingredient.id] = ingredient.prices.map((price) => ({
      id: price.id,
      pricePerBaseUnit: price.pricePerBaseUnit,
      purchaseQty: price.purchaseQty,
      purchaseUnit: price.purchaseUnit,
      price: price.price,
      effectiveFrom: price.effectiveFrom,
    }));
  }
  return book;
}
