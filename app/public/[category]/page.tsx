import { notFound } from "next/navigation";

interface PublicService {
	id: string;
	name: string;
	description?: string | null;
	category: { id: string; name: string };
	parentServiceId?: string | null;
}

async function fetchServices(category: string): Promise<PublicService[]> {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/public/services?category=${encodeURIComponent(category)}`, {
		cache: 'no-store'
	});
	if (!res.ok) throw new Error('Failed to fetch services');
	return res.json();
}

export default async function PublicCategoryPage({ params }: { params: { category: string } }) {
	const categoryParam = decodeURIComponent(params.category);
	const services = await fetchServices(categoryParam);
	if (!services || services.length === 0) {
		return notFound();
	}

	// Special layout for Karvanpoistot
	const isKarvanpoistot = categoryParam.toLowerCase() === 'karvanpoistot';

	// Group by parent
	const parents = services.filter(s => !s.parentServiceId);
	const subsByParent: Record<string, PublicService[]> = {};
	for (const s of services) {
		if (s.parentServiceId) {
			subsByParent[s.parentServiceId] = subsByParent[s.parentServiceId] || [];
			subsByParent[s.parentServiceId].push(s);
		}
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			{parents.map((parent) => (
				<section key={parent.id} className="mb-10">
					<h2 className="text-center text-2xl font-semibold mb-2">{parent.name}</h2>
					{isKarvanpoistot && (
						<p className="text-center text-sm text-muted-foreground max-w-xl mx-auto mb-6">
							{parent.description || ''}
						</p>
					)}
					<div className={isKarvanpoistot ? "grid grid-cols-2 gap-4" : "grid gap-3"}>
						{(subsByParent[parent.id] || []).map((sub) => (
							<button
								key={sub.id}
								className={"w-full rounded-2xl border border-amber-300 px-4 py-4 text-center text-base font-medium shadow-sm bg-white"}
							>
								{sub.name}
							</button>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
