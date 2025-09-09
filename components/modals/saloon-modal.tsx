"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaloonModal } from "@/hooks/use-saloon-modal";
import ImageUpload from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";

export const SaloonModal = () => {
    const { storeId } = useParams<{ storeId: string }>() as { storeId?: string };
    const router = useRouter();
    const saloonModal = useSaloonModal();
    const [saloonId, setSaloonId] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [createMode, setCreateMode] = useState(false);
    const [newName, setNewName] = useState("");
    const [newShortIntro, setNewShortIntro] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newImages, setNewImages] = useState<string[]>([]);
    const canSubmit = useMemo(() => saloonId.trim().length > 0, [saloonId]);

    useEffect(() => {
        // If no store context, keep closed
        if (!storeId) return;
        // Fetch user-owned saloons for this store
        const fetchSaloons = async () => {
            try {
                const res = await axios.get(`/api/${storeId}/saloons?owned=1`);
                const list = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
                setOptions(list);
            } catch {}
        };
        fetchSaloons();
        setCreateMode(false);
        setNewName("");
        setNewShortIntro("");
        setNewAddress("");
        setNewDescription("");
        setNewImages([]);
    }, [storeId]);

    const onSubmit = async () => {
        if (!storeId || !canSubmit) return;
        try {
            setLoading(true);
            // Validate saloon belongs to store and user
            const url = `/api/${storeId}/saloons/${saloonId}`;
            await axios.get(url);
            // Persist in cookie scoped to store
            document.cookie = `selectedSaloonId_${storeId}=${saloonId}; path=/; max-age=${60 * 60 * 24 * 30}`;
            saloonModal.onClose();
            router.refresh();
        } catch (e) {
            // noop
        } finally {
            setLoading(false);
        }
    };

    const onCreate = async () => {
        if (!storeId) return;
        if (!newName || newImages.length === 0) return;
        try {
            setLoading(true);
            const payload = {
                name: newName,
                shortIntro: newShortIntro || undefined,
                address: newAddress || undefined,
                description: newDescription || undefined,
                images: newImages.map((url) => ({ url })),
            };
            const res = await axios.post(`/api/${storeId}/saloons`, payload);
            const created = res.data as { id: string };
            if (created?.id) {
                document.cookie = `selectedSaloonId_${storeId}=${created.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
                saloonModal.onClose();
                router.refresh();
            }
        } catch (e) {
            // noop
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Select Saloon"
            description="Enter your Saloon ID to filter your dashboard."
            isOpen={saloonModal.isOpen}
            onClose={saloonModal.onClose}
        >
            <div className="space-y-4 py-2 pb-4">
                {options.length > 0 && !createMode && (
                    <>
                        <Select value={saloonId} onValueChange={setSaloonId} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your saloon" />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((opt) => (
                                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">Or create a new saloon</div>
                            <Button type="button" variant="outline" size="sm" onClick={() => setCreateMode(true)}>Create New</Button>
                        </div>
                        <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                            <Button variant="outline" disabled={loading} onClick={saloonModal.onClose}>Cancel</Button>
                            <Button disabled={!canSubmit || loading} onClick={onSubmit}>Continue</Button>
                        </div>
                    </>
                )}

                {(options.length === 0 || createMode) && (
                    <>
                        <div className="space-y-3">
                            <div>
                                <div className="text-sm font-medium mb-2">Images</div>
                                <ImageUpload
                                    value={newImages}
                                    disabled={loading}
                                    onChange={(url) => setNewImages((v) => [...v, url])}
                                    onRemove={(url) => setNewImages((v) => v.filter((u) => u !== url))}
                                />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Name</div>
                                <Input disabled={loading} placeholder="Enter saloon name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Short Introduction</div>
                                <Input disabled={loading} placeholder="Enter short introduction" value={newShortIntro} onChange={(e) => setNewShortIntro(e.target.value)} />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Address</div>
                                <Input disabled={loading} placeholder="Enter address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-1">Description</div>
                                <Textarea disabled={loading} placeholder="Enter description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                            </div>
                        </div>
                        <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                            {options.length > 0 && (
                                <Button type="button" variant="ghost" disabled={loading} onClick={() => setCreateMode(false)}>Back</Button>
                            )}
                            <Button variant="outline" disabled={loading} onClick={saloonModal.onClose}>Cancel</Button>
                            <Button disabled={loading || !newName || newImages.length === 0} onClick={onCreate}>Create</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default SaloonModal;


