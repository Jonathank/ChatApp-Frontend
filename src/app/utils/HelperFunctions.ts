import { MyUser } from "../types/interfaces";

// Helper function to process user data consistently
export const processUserData = (data: any): MyUser => {
    return {
        id: data.id.toString(),
        username: data.username,
        email: data.email,
        online: data.online ?? true,
        status: data.status ?? "active",
        image: data.image
            ? {
                id: data.image.id.toString(),
                downloadUrl: data.image.downloadUrl,
            }
            : undefined,
    };
};



