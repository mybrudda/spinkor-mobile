import { useState, useEffect } from 'react';

export interface VehicleModel {
  id: string;
  name: string;
}

export const useVehicleModels = (selectedMake: string) => {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || selectedMake === 'Other') {
        setModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        // Use NHTSA API to fetch vehicle models
        const response = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(selectedMake)}?format=json`
        );

        if (response.ok) {
          const data = await response.json();
          // Transform the API response to match our expected format
          const modelList =
            data.Results?.map((item: any) => ({
              id: item.Model_ID?.toString() || '',
              name: item.Model_Name || '',
            })) || [];
          // Sort models alphabetically by name
          const sortedModels = modelList.sort((a: VehicleModel, b: VehicleModel) =>
            a.name.localeCompare(b.name)
          );
          setModels(sortedModels);
        } else {
          console.error('Failed to fetch models:', response.status);
          setModels([]);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedMake]);

  return {
    models,
    loadingModels,
  };
};
