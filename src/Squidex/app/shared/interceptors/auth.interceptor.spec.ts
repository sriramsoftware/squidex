/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved
 */

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpHeaders, HTTP_INTERCEPTORS } from '@angular/common/http';
import { inject, TestBed } from '@angular/core/testing';
import { IMock, Mock, Times } from 'typemoq';

import {
    ApiUrlConfig,
    AuthService,
    AuthInterceptor
} from './../';

describe('AppClientsService', () => {
    let authService: IMock<AuthService> = null;

    beforeEach(() => {
        authService = Mock.ofType(AuthService);
        authService.setup(x => x.user).returns(() => { return <any>{ authToken: 'letmein' }; });

        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule
            ],
            providers: [
                { provide: AuthService, useValue: authService.object },
                { provide: ApiUrlConfig, useValue: new ApiUrlConfig('http://service/p/') },
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: AuthInterceptor,
                    multi: true
                }
            ]
        });
    });

    afterEach(inject([HttpTestingController], (httpMock: HttpTestingController) => {
        httpMock.verify();
    }));

    it('should append headers to request',
        inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

        http.get('http://service/p/apps').subscribe();

        const req = httpMock.expectOne('http://service/p/apps');

        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('letmein');
        expect(req.request.headers.get('Accept-Language')).toEqual('*');
        expect(req.request.headers.get('Pragma')).toEqual('no-cache');
    }));

    it('should not append headers for no auth headers',
        inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

        http.get('http://service/p/apps', { headers: new HttpHeaders().set('NoAuth', '') }).subscribe();

        const req = httpMock.expectOne('http://service/p/apps');

        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toBeNull();
        expect(req.request.headers.get('Accept-Language')).toBeNull();
        expect(req.request.headers.get('Pragma')).toBeNull();
    }));

    it('should not append headers for other requests',
        inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

        http.get('http://cloud/p/apps').subscribe();

        const req = httpMock.expectOne('http://cloud/p/apps');

        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toBeNull();
        expect(req.request.headers.get('Accept-Language')).toBeNull();
        expect(req.request.headers.get('Pragma')).toBeNull();
    }));

    it(`should logout for 404 status code when user is expired.`,
        inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

        authService.setup(x => x.user).returns(() => { return <any>{ authToken: 'letmein', isExpired: true }; });

        http.get('http://service/p/apps').subscribe(
            _ => { /* NOOP */ },
            _ => { /* NOOP */ });

        const req = httpMock.expectOne('http://service/p/apps');

        req.error(<any>{}, { status: 404 });

        authService.verify(x => x.logoutRedirect(), Times.once());
    }));

    [401, 403].forEach(statusCode => {
        it(`should logout for ${statusCode} status code`,
            inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

            http.get('http://service/p/apps').subscribe(
                _ => { /* NOOP */ },
                _ => { /* NOOP */ });

            const req = httpMock.expectOne('http://service/p/apps');

            req.error(<any>{}, { status: statusCode });

            authService.verify(x => x.logoutRedirect(), Times.once());
        }));
    });

    [500, 404, 405].forEach(statusCode => {
        it(`should not logout for ${statusCode} status code`,
            inject([HttpClient, HttpTestingController], (http: HttpClient, httpMock: HttpTestingController) => {

            http.get('http://service/p/apps').subscribe(
                _ => { /* NOOP */ },
                _ => { /* NOOP */ });

            const req = httpMock.expectOne('http://service/p/apps');

            req.error(<any>{}, { status: statusCode });

            authService.verify(x => x.logoutRedirect(), Times.never());
        }));
    });
});