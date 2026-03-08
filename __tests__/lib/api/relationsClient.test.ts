jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
    coreDelete: jest.fn(),
}));

import { coreGet, corePost, coreDelete } from '@/lib/api/coreClient';
import {
    getRelationsForSpace,
    getRelationsForNode,
    createRelation,
    deleteRelation,
} from '@/lib/api/relationsClient';

beforeEach(() => jest.clearAllMocks());

describe('relationsClient v3', () => {
    it('getRelationsForSpace routes to GET /v3/relations/space/{id}', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ relations: [], nodes: [] });
        await getRelationsForSpace('sp-1');
        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/space/sp-1')
        );
    });

    it('getRelationsForNode routes to GET /v3/relations/node/{id}', async () => {
        (coreGet as jest.Mock).mockResolvedValue([]);
        await getRelationsForNode('nd-2');
        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/node/nd-2')
        );
    });

    it('createRelation routes to POST /v3/relations', async () => {
        (corePost as jest.Mock).mockResolvedValue({ id: 'rel-1' });
        await createRelation({ source_id: 'a', target_id: 'b', kind: 'link', weight: 0.7 });
        expect(corePost).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations'),
            expect.anything()
        );
    });

    it('deleteRelation routes to DELETE /v3/relations/{id}', async () => {
        (coreDelete as jest.Mock).mockResolvedValue(undefined);
        await deleteRelation('rel-99');
        expect(coreDelete).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/rel-99')
        );
    });
});
